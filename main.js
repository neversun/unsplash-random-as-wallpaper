const fs = require('fs')
const util = require('util')
const path = require('path')

const promisify = util.promisify

const readFileAsync = promisify(fs.readFile)

const fetch = require('node-fetch')
global.fetch = fetch

const wallpaper = require('wallpaper')
const stripJsonComments = require('strip-json-comments')
const Unsplash = require('unsplash-js').default

async function main() {
  const APP_ACCESS_KEY = await readFileAsync(path.join(__dirname, 'config_access-key.txt'), { encoding: 'utf8' })
  const APP_SECRET = await readFileAsync(path.join(__dirname, 'config_secret-key.txt'), { encoding: 'utf8' })

  if (!APP_ACCESS_KEY || !APP_SECRET) {
    throw new Error('Could not read config_access-key.txt or config_secret-key.txt')
  }

  console.log(`Using APP_ACCESS_KEY "${APP_ACCESS_KEY}" with APP_SECRET "${APP_SECRET}"`)

  const unsplash = new Unsplash({
    applicationId: `${APP_ACCESS_KEY.trim()}`,
    secret: `${APP_SECRET.trim()}`
  })

  let config = {}

  try {
    const configFilePath = `${path.join(__dirname, 'config_random-photo.json')}`

    console.log(`Reading config file "${path}"`)

    const configFileContent = await readFileAsync(configFilePath, { encoding: 'utf8' })

    config = JSON.parse(stripJsonComments(configFileContent))
  } catch (error) {
    throw new Error(`Could not read config file`, error.toString(), error.stack, error)
  }

  const response = await unsplash.photos.getRandomPhoto(config)

  const photo = await response.json()

  const fileName = `${photo.user.first_name}-${photo.user.last_name}-${photo.id}-unsplash.jpg`.toLowerCase()
  const outputPath = path.join(__dirname, 'data', fileName)

  const downloadUrl = photo.urls.raw

  console.log(`Downloading ${downloadUrl} to ${outputPath}`)

  const imageResponse = await fetch(downloadUrl)

  try {
    await writeStream(outputPath, imageResponse.body)
  } catch (e) {
    throw new Error(`Could not donwload file to ${outputPath}`)
  }

  console.log(`Set desktop wallpaper to ${outputPath}`)

  await wallpaper.set(outputPath)
}

function writeStream(path, readable) {
  return new Promise(async (resolve, reject) => {
    try {
      await readFileAsync(path)
      return resolve()
    } catch (e) {}

    const writeStream = fs.createWriteStream(path)

    writeStream.on('close', () => resolve())
    writeStream.on('error', () => reject())

    readable.pipe(writeStream)
  })
}

(async() => {

  try {
    await main()
  } catch (error) {
    console.error(`Error: ${error.toString()}`, error.stack, error)
  }

})()