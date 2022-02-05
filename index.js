import { TwitterApi } from "twitter-api-v2"
import { ethers, utils } from "ethers"
import { readFile } from "fs/promises"
import "dotenv/config"

const contractABI = JSON.parse(
  await readFile(new URL("./CommonCalendarABI.json", import.meta.url))
)
const legacyContractABI = JSON.parse(
  await readFile(new URL("./legacyCommonCalendarABI.json", import.meta.url))
)
const contractStewardABI = JSON.parse(
  await readFile(new URL("./StewardABI.json", import.meta.url))
)
const legacyContractStewardABI = JSON.parse(
  await readFile(new URL("./legacyStewardABI.json", import.meta.url))
)

// open sea v2 collection
// https://opensea.io/collection/commoncalendar-v2
// logo url https://calendar.org/logo512.png

const getTodaysTokenId = () => {
  // Formula in contract
  // tokenId = uint256(month).mul(100).add(dayOfMonth);
  // const date = new Date('January 1, 1995 03:24:00')
  const date = new Date()
  return (date.getUTCMonth() + 1) * 100 + date.getUTCDate()
}

/**
 * Responds to an HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
export const tweetDay = async (req, res) => {
  // Twitter read/write permissions for single user using Oauth1.
  const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  })

  const CommonCalenderAddress = "0x5228787dBc773CfdaE72Bb98B6f27FbB546e0292"
  const LegacyCommonCalenderAddress =
    "0xc9015e8Dd7a22C765e59a92Ee194AB8A55644988"
  const StewardAddress = "0xb283c835410DC2c8429fBb38a410Ce021E263C78"
  const LegacyStewardAddress = "0xc508E4651884c79f05Daca3Bc7182a76DBB8E3c8"
  const alchemyProvider = new ethers.providers.AlchemyProvider(
    "homestead",
    process.env.ALCHEMY_API_KEY
  )
  const contract = new ethers.Contract(
    CommonCalenderAddress,
    contractABI,
    alchemyProvider
  )
  const legacyContract = new ethers.Contract(
    LegacyCommonCalenderAddress,
    legacyContractABI,
    alchemyProvider
  )
  const contractSteward = new ethers.Contract(
    StewardAddress,
    contractStewardABI,
    alchemyProvider
  )
  const legacyContractSteward = new ethers.Contract(
    LegacyStewardAddress,
    legacyContractStewardABI,
    alchemyProvider
  )
  const newTodaysName = await contract.getTodayName()
  const legacyTodaysName = await legacyContract.getTodayName()
  console.log("TodaysName: " + newTodaysName)
  console.log("LegacyTodaysName: " + legacyTodaysName)

  let todaysName = ""
  let isLegacyDay = false
  if (newTodaysName !== "") {
    todaysName = newTodaysName
  } else if (legacyTodaysName !== "") {
    todaysName = legacyTodaysName
    isLegacyDay = true
  }

  // get tokenId to get owner
  const todayTokenId = getTodaysTokenId()
  console.log("Today's tokenId: ", todayTokenId)

  let todayOwner
  let todayPrice
  let todayTotalCollected
  let todaysTokenAddress
  if (isLegacyDay) {
    todayOwner = await legacyContract.ownerOf(todayTokenId)
    todayPrice = await legacyContractSteward.price(todayTokenId)
    todayTotalCollected = await legacyContractSteward.totalCollected(
      todayTokenId
    )
    todaysTokenAddress = LegacyCommonCalenderAddress
  } else {
    todayOwner = await contract.ownerOf(todayTokenId)
    todayPrice = await contractSteward.price(todayTokenId)
    todayTotalCollected = await contractSteward.totalCollected(todayTokenId)
    todaysTokenAddress = CommonCalenderAddress
  }
  console.log(
    "Total collected for today: ",
    utils.formatEther(todayTotalCollected)
  )
  todayPrice = utils.formatEther(todayPrice)
  let ownerText = todayOwner
  // const ensName = await alchemyProvider.lookupAddress("0x2b99EC82d658F7a77DdEbFd83D0f8F591769cB64");
  try {
    const ensName = await alchemyProvider.lookupAddress(todayOwner)
    if (ensName) {
      ownerText = ensName
      console.log("Today's ownwer's ens name: ", ensName)
    }
  } catch (e) {
    console.error("Error getting ensName for address: ", todayOwner)
  }

    // supports ens or 0x-addresss
  const etherscanOwnerURL = `https://etherscan.io/address/${ownerText}`
  const etherscanTokenIdLink = `https://etherscan.io/token/${todaysTokenAddress}?a=${todayTokenId}`
  const blockscoutOwnerURL = `https://blockscout.com/eth/mainnet/address/${todayOwner}/transactions`
  const blockscoutTokenIdLink = `https://blockscout.com/eth/mainnet/token/${todaysTokenAddress}/instance/${todayTokenId}/token-transfers`

  // const text = "Today is \"" + todaysName + "\"!\n\ncalendar.org"
  const text = `Today is \"${todaysName}\"!\n\nNamed by owner ${ownerText}. Valued at Ξ${todayPrice}\n\nSubject to a 1% per year Harberger Tax to the Common Calendar project. More at calendar.org`
  console.log("Tweet text:" + text)

  const urlsTweetText = `Today's Owner\nEtherscan: ${etherscanOwnerURL}\nBlockscout: ${blockscoutOwnerURL}\n\nToday's NFT\nEtherescan: ${etherscanTokenIdLink}\nBlockscout: ${blockscoutTokenIdLink}`
  console.log("Tweet urls:" + urlsTweetText)

  // Read+Write level
  const rwClient = twitterClient.readWrite
  try {
    await rwClient.v2.tweetThread([text, urlsTweetText])
  } catch (e) {
    console.error("failled to create tweet")
    console.error(e)
    res.status(500).send(e)
  }

  res.status(200).send("Tweeted successfully")
}
