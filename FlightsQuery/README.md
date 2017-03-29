# Flights Query

An Azure function which finds flights that departed between 6 and 3 hours ago and
adds them to a queue if the flights match the requirements for EU regulation 261/2004.

## Config

The `DB_URL` environment variable needs to be set to a valid MongoDB connection string.
