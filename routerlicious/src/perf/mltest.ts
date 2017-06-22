// We should probably move this file to somewhere else. perf folder is not the right place.
import * as request from "request";

console.log("Testing ml service...");
runTest();

async function runTest() {
    console.log("Wait for 10 seconds to warm up everything....");
    await sleep(10000);
    await test();
}

async function test() {
    const data: any = {documents: [{
        text: "REST services could be dangerous",
    }]};
    return new Promise<any>((resolve, reject) => {
        request.post(
            "http://ml:8080/api/sentiment/query",
            {
                body: data,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json: true,
            },
            (error, result, body) => {
                if (error) {
                    console.log(`Error fetching result: ${error}`);
                    return reject(error);
                }

                if (result.statusCode !== 200) {
                    console.log(`Error: Invalid response code: ${JSON.stringify(result)}`);
                    return reject(result);
                }

                console.log(`Success fetching data: ${JSON.stringify(body)}`);
                return resolve(body);
            });
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
