build:
	GOOS=js GOARCH=wasm go build -o pdfcpu.wasm

static_server:
	node static_server.js
