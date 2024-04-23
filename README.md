# FVLR_API
fvlr_api is an unoffical api for [vlr.gg](https://vlr.gg)

## Usage
```
git clone https://github.com/Techeron/fvlr_api
cd fvlr_api
// Runns the redis database for caching
docker compose up -d
// Currently the api docker image is not working so you have to start it up manuly
bun i
bun dev
```
The API is running on port 9091.

The API docs can be found on the [base route](http://localhost:9091)

## Contributing
Feel free to submit a [pull request](https://github.com/Techeron/fvlr_api/pull/new/master) or an [issue](https://github.com/Techeron/fvlr_api/issues/new)!

## License
The MIT License (MIT)
