// callback 

// Promise 

// async await 

function doSomething(callback){

    setTimeout(() => {
        callback("done");
       
    }, 3000);
}

function HiShiran(str="shiran"){
    console.log("Hi " + str);
}


// promse - succes/failure async operation (pending, fulfilled, rejected)

async function getAgentResponse(){
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve("Agent says no cookie for u");
        }, 3000);
    });
}

async function main(){
    try {
        Promise.all([getAgentResponse(), getAgentResponse(), getAgentResponse(), getAgentResponse()]).then((results) => {
            console.log(results)
        }).catch((error) => {
            console.log(error)
        })
        // const result1 = await getAgentResponse();
        // console.log(result1)
        // const result2 = await getAgentResponse();
        // console.log(result2)
        // const result3 = await getAgentResponse();
        // console.log(result3)
        // const result4 = await getAgentResponse();
        // console.log(result4)
    } catch (error) {
        console.log(error)
    }
}
main()