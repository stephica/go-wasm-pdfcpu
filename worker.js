importScripts("https://cdnjs.cloudflare.com/ajax/libs/BrowserFS/2.0.0/browserfs.js");
importScripts("https://cdn.jsdelivr.net/npm/comlinkjs@3.1.1/umd/comlink.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/bluebird/3.5.4/bluebird.min.js");

class GoWorker {
    constructor() {
        this.fs = Promise.promisifyAll(BrowserFS.BFSRequire('fs'));
		console.log("GoWorker constructed");
	}

    async version() {
        try {
            this.go.argv = ['pdfcpu.wasm', 'version'];
            var st = Date.now();
            await this.go.run(this.instance);
            console.log('pdfcpu version check Time taken:', Date.now() - st);

            console.log('version call exit code', this.go.exitCode);
            return this.go.exitCode === 0;
        } catch (e) {
            console.error('version error', e);
            return false;
        }
	}

    async validate() {

        try {
            this.go.argv = ['pdfcpu.wasm', 'validate', '/test.pdf'];
			var st = Date.now();
			console.log("before valid")
			await this.go.run(this.instance);
			console.log("after valid")
            console.log('Time taken:', Date.now() - st);

			const ok = this.go.exitCode === 0;
            console.log('validate succ', ok, 'exit code', this.go.exitCode)
            return ok;
        } catch (e) {
            console.error('validate error', e);
            return false;
        }
    }

    async extractPage(buffer, page) {
        this.go.argv = ['pdfcpu.wasm', 'trim', '-pages', String(page), '/test.pdf', '/first_page.pdf'];
		var st = Date.now();
		console.log("before extract")
        await this.go.run(this.instance);
		console.log('trim Time taken:', Date.now() - st);
		return

        // await this.fs.fstat('/first_page.pdf', function(a0, retStat){
		// 	console.log("a0", a0)
		// 	console.log("fstat 1st page", retStat)
		// });
		console.log("before read 1st page")
        let contents = await this.fs.readFileAsync('/first_page.pdf');
		console.log("after read 1st page")
		// console.log("after run main:", contents);
		// console.log("read first page")

        this.fs.unlink('/test.pdf', err => {
            console.log("Removed test.pdf", err);
            this.fs.unlink('/first_page.pdf', err2 => {
                console.log("Removed first_page.pdf", err);
            })
        })

        return contents;
	}
	
	async initWasm() {
        this.go = new Go();

        if(!this.compiledModule) {
            let result = await WebAssembly.instantiateStreaming(fetch("pdfcpu.wasm"), this.go.importObject);
            console.log("wasm module compiled!")
            this.compiledModule = result.module; // cache, so that no need to download next time process is called
            this.instance = result.instance;
        } else {
            this.instance = await WebAssembly.instantiate(this.compiledModule, this.go.importObject);
		}
	}

    // Write input to /test.pdf in browser fs
    createPDFObj(buffer) {
        // we have to new Go() and create a new instance each time
        // because there are states in the go obj that prevent it from running multiple times
		console.log("start write test.pdf")
        this.fs.writeFileSync('/test.pdf', Buffer.from(buffer));
		console.log("write test.pdf done")

		// console.log("before read test")
        // let contents = await this.fs.readFileAsync('/test.pdf');
        // this.fs.unlink('/test.pdf', err => {
		// 	console.log("unlink test.pdf error", err)
		// })
        // console.log(contents);
		// console.log("end read test")
    }
}

console.log("pre config");
// Configures BrowserFS to use the InMemory file system.
BrowserFS.configure({
    fs: "InMemory"
}, function(e) {
    if (e) {
        // An error happened!
        throw e;
    }
    importScripts('./wasm_exec.js');
    console.log("browserfs initialized!")
    Comlink.expose(GoWorker, self);
});

