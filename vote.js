'use strict';

const FabricCAServices = require('fabric-ca-client');
const {
    FileSystemWallet,
    Gateway,
    X509WalletMixin
} = require('fabric-network');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const ccpPath = path.resolve(__dirname, 'local_fabric_connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

async function enrollAdmin() {
    try {
        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const ca = new FabricCAServices(caInfo.url, {}, caInfo.caName);
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (adminExists) {
            console.log(
                'An identity for the admin user "admin" already exists in the wallet'
            );
            return;
        }
        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });
        const identity = X509WalletMixin.createIdentity(
            'Org1MSP',
            enrollment.certificate,
            enrollment.key.toBytes()
        );
        await wallet.import('admin', identity);
        console.log(
            'Successfully enrolled admin user "admin" and imported it into the wallet'
        );
    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
    }
}

async function registerUser() {
    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists('user1');
        if (userExists) {
            console.log(
                'An identity for the user "user1" already exists in the wallet'
            );
            return;
        }
        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            console.log(
                'An identity for the admin user "admin" does not exist in the wallet'
            );
            console.log('Run the enrollAdmin.js application before retrying');
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true }
        });
        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();
        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register(
            {
                affiliation: 'org1.department1',
                enrollmentID: 'user1',
                role: 'client'
            },
            adminIdentity
        );
        const enrollment = await ca.enroll({
            enrollmentID: 'user1',
            enrollmentSecret: secret
        });
        const userIdentity = X509WalletMixin.createIdentity(
            'Org1MSP',
            enrollment.certificate,
            enrollment.key.toBytes()
        );
        await wallet.import('user1', userIdentity);
        console.log(
            'Successfully registered and enrolled admin user "user1" and imported it into the wallet'
        );
    } catch (error) {
        console.error(`Failed to register user "user1": ${error}`);
    }
}

module.exports = app => {
    app.get('/enrollAdmin', async (req, res) => {
        try {
            enrollAdmin();
            res.end();
        } catch (erro) {
            res.sendStatus(500);
            ('');
        }
    });

    app.get('/registerUser', async (req, res) => {
        try {
            registerUser();
            res.end();
        } catch (erro) {
            res.sendStatus(500);
        }
    });

    app.get('/all', async (req, res) => {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log(
                'An identity for the user "user1" does not exist in the wallet'
            );
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'user1',
            discovery: { enabled: true, asLocalhost: true }
        });
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        const contract = network.getContract('voting-app-backend');
        // Check if user exist
        // await contract.submitTransaction('deleteVote', 'vote1');
        // await contract.submitTransaction('deleteVote', 'vote0');
        const allVote = await contract.evaluateTransaction('getAllVote');
        const rawData = JSON.parse(allVote.toString());
        const data = JSON.parse(rawData);

        res.status(200).send(data);
    });

    // Server route that allows creates a new voting candidate
    app.post('/user', async (req, res) => {
        try {
            const name = req.body.name;
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
            const userExists = await wallet.exists('user1');
            if (!userExists) {
                console.log(
                    'An identity for the user "user1" does not exist in the wallet'
                );
                console.log(
                    'Run the registerUser.js application before retrying'
                );
                return;
            }
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccpPath, {
                wallet,
                identity: 'user1',
                discovery: { enabled: true, asLocalhost: true }
            });
            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork('mychannel');
            // Get the contract from the network.
            const contract = network.getContract('voting-app-backend');
            // Check if user exist
            const allVote = await contract.evaluateTransaction('getAllVote');
            const rawData = JSON.parse(allVote.toString());
            const data = JSON.parse(rawData);
            let isExist = false;
            if (Array.isArray(data)) {
                data.map(val => {
                    let tmp = JSON.parse(val.Record.value);
                    Object.keys(tmp).map(key => {
                        if (key === name) {
                            isExist = true;
                        }
                    });
                });
            }
            if (!isExist) {
                // If not exist create txn
                let result = await contract.submitTransaction('getLastVote');
                let txnId = '';
                result = JSON.parse(result.toString());
                let resultObject = JSON.parse(result);
                if (resultObject && Object.keys(resultObject).length === 0) {
                    txnId = 'vote0';
                } else {
                    const tmp = resultObject.Key;
                    let idx = parseInt(tmp.substring(4));
                    idx++;
                    txnId = 'vote' + idx;
                }
                await contract.submitTransaction(
                    'createVote',
                    txnId,
                    JSON.stringify({
                        [name]: 0
                    })
                );
            }
            res.sendStatus(200);
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Server route that queries all the votes for a given user
    app.get('/vote', async (req, res) => {
        try {
            const name = req.query.name;
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
            const userExists = await wallet.exists('user1');
            if (!userExists) {
                console.log(
                    'An identity for the user "user1" does not exist in the wallet'
                );
                console.log(
                    'Run the registerUser.js application before retrying'
                );
                return;
            }
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccpPath, {
                wallet,
                identity: 'user1',
                discovery: { enabled: true, asLocalhost: true }
            });
            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork('mychannel');
            // Get the contract from the network.
            const contract = network.getContract('voting-app-backend');
            // Get all data
            const allVote = await contract.evaluateTransaction('getAllVote');
            const rawData = JSON.parse(allVote.toString());
            const data = JSON.parse(rawData);
            let filteredData = [];
            let isExist = false;
            // Filter data from record
            if (Array.isArray(data)) {
                filteredData = data.map(val => {
                    let tmp = JSON.parse(val.Record.value);
                    isExist = false;
                    for (let key in tmp) {
                        if (key === name) {
                            isExist = true;
                        }
                    }
                    if (!isExist) {
                        return tmp;
                    }
                });
            }
            // Remove undefined
            filteredData = filteredData.filter(data => data);
            // Compose final data into object
            let finalData = {};
            filteredData.forEach(el => {
                Object.keys(el).map(key => {
                    finalData[key] = el[key];
                });
            });
            res.status(200).send(finalData);
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Server route that queries all votes for all users on the platform
    app.get('/vote/all', async (req, res) => {
        try {
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
            const userExists = await wallet.exists('user1');
            if (!userExists) {
                console.log(
                    'An identity for the user "user1" does not exist in the wallet'
                );
                console.log(
                    'Run the registerUser.js application before retrying'
                );
                return;
            }
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccpPath, {
                wallet,
                identity: 'user1',
                discovery: { enabled: true, asLocalhost: true }
            });
            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork('mychannel');
            // Get the contract from the network.
            const contract = network.getContract('voting-app-backend');
            // Get all data
            const allVote = await contract.evaluateTransaction('getAllVote');
            const rawData = JSON.parse(allVote.toString());
            const data = JSON.parse(rawData);
            let filteredData = [];
            // Filter data from record
            if (Array.isArray(data)) {
                filteredData = data.map(val => JSON.parse(val.Record.value));
            }
            // Compose final data into object
            let finalData = {};
            filteredData.forEach(el => {
                Object.keys(el).map(key => {
                    finalData[key] = el[key];
                });
            });
            res.status(200).send(finalData);
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Server route that adds a vote to a given user
    app.post('/vote', async (req, res) => {
        try {
            const name = req.body.name;
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = new FileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);
            const userExists = await wallet.exists('user1');
            if (!userExists) {
                console.log(
                    'An identity for the user "user1" does not exist in the wallet'
                );
                console.log(
                    'Run the registerUser.js application before retrying'
                );
                return;
            }
            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccpPath, {
                wallet,
                identity: 'user1',
                discovery: { enabled: true, asLocalhost: true }
            });
            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork('mychannel');
            // Get the contract from the network.
            const contract = network.getContract('voting-app-backend');
            // Get all data
            const allVote = await contract.evaluateTransaction('getAllVote');
            const rawData = JSON.parse(allVote.toString());
            const data = JSON.parse(rawData);
            let filteredData = [];
            let isExist = false;
            // Filter data from record
            if (Array.isArray(data)) {
                filteredData = data.map(val => {
                    let tmp = JSON.parse(val.Record.value);
                    isExist = false;
                    for (let key in tmp) {
                        if (key === name) {
                            isExist = true;
                        }
                    }
                    if (isExist) {
                        return val;
                    }
                });
            }
            // Remove undefined
            filteredData = filteredData.filter(data => data);
            console.log(filteredData);
            // Compose final data into object
            let finalData = {};
            filteredData.forEach(el => {
                Object.keys(el).map(key => {
                    finalData[key] = el[key];
                });
            });
            // Get the id and the transaction
            const txnId = finalData.Key;
            let value = JSON.parse(finalData.Record.value);
            let nameVal = '';
            let totalCount = 0;
            for (let val in value) {
                let count = parseInt(value[val]);
                nameVal = val;
                totalCount = count + 1;
            }
            await contract.submitTransaction(
                'updateVote',
                txnId,
                JSON.stringify({
                    [nameVal]: totalCount
                })
            );
            res.sendStatus(200);
        } catch (err) {
            res.status(500).send(err);
        }
    });

    // Server route that removes a vote from a given user
    app.put('/vote', async (req, res) => {
        const name = req.body.name;
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log(
                'An identity for the user "user1" does not exist in the wallet'
            );
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'user1',
            discovery: { enabled: true, asLocalhost: true }
        });
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        const contract = network.getContract('voting-app-backend');
        // Get all data
        const allVote = await contract.evaluateTransaction('getAllVote');
        const rawData = JSON.parse(allVote.toString());
        const data = JSON.parse(rawData);
        let filteredData = [];
        let isExist = false;
        // Filter data from record
        if (Array.isArray(data)) {
            filteredData = data.map(val => {
                let tmp = JSON.parse(val.Record.value);
                isExist = false;
                for (let key in tmp) {
                    if (key === name) {
                        isExist = true;
                    }
                }
                if (isExist) {
                    return val;
                }
            });
        }
        // Remove undefined
        filteredData = filteredData.filter(data => data);
        // Compose final data into object
        let finalData = {};
        filteredData.forEach(el => {
            Object.keys(el).map(key => {
                finalData[key] = el[key];
            });
        });
        // Get the id and the transaction
        const txnId = finalData.Key;
        let value = JSON.parse(finalData.Record.value);
        let nameVal = '';
        let totalCount = 0;
        for (let val in value) {
            let count = parseInt(value[val]);
            nameVal = val;
            totalCount = count - 1;
        }
        await contract.submitTransaction(
            'updateVote',
            txnId,
            JSON.stringify({
                [nameVal]: totalCount
            })
        );
        res.sendStatus(200);
    });

    // Server route that allows a user to delete a voting candidate
    app.delete('/user', async (req, res) => {
        const name = 'Michael Alvado Heimbach';
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log(
                'An identity for the user "user1" does not exist in the wallet'
            );
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'user1',
            discovery: { enabled: true, asLocalhost: true }
        });
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        const contract = network.getContract('voting-app-backend');
        // Get all data
        const allVote = await contract.evaluateTransaction('getAllVote');
        const rawData = JSON.parse(allVote.toString());
        const data = JSON.parse(rawData);
        let filteredData = [];
        let isExist = false;
        // Filter data from record
        if (Array.isArray(data)) {
            filteredData = data.map(val => {
                let tmp = JSON.parse(val.Record.value);
                isExist = false;
                for (let key in tmp) {
                    if (key === name) {
                        isExist = true;
                    }
                }
                if (isExist) {
                    return val;
                }
            });
        }
        // Remove undefined
        filteredData = filteredData.filter(data => data);
        // Compose final data into object
        let finalData = {};
        filteredData.forEach(el => {
            Object.keys(el).map(key => {
                finalData[key] = el[key];
            });
        });
        // Get the id and the transaction
        const txnId = finalData.Key;
        await contract.submitTransaction('deleteVote', txnId);
        res.sendStatus(200);
    });

    // Server route that allows a user to reset the votes to 0 for a candidate
    app.delete('/vote', async (req, res) => {
        // const name = 'Michael Alvado Heimbach';
        const name = 'Daniel Heimbach';
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        const userExists = await wallet.exists('user1');
        if (!userExists) {
            console.log(
                'An identity for the user "user1" does not exist in the wallet'
            );
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, {
            wallet,
            identity: 'user1',
            discovery: { enabled: true, asLocalhost: true }
        });
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        const contract = network.getContract('voting-app-backend');
        // Get all data
        const allVote = await contract.evaluateTransaction('getAllVote');
        const rawData = JSON.parse(allVote.toString());
        const data = JSON.parse(rawData);
        let filteredData = [];
        let isExist = false;
        // Filter data from record
        if (Array.isArray(data)) {
            filteredData = data.map(val => {
                let tmp = JSON.parse(val.Record.value);
                isExist = false;
                for (let key in tmp) {
                    if (key === name) {
                        isExist = true;
                    }
                }
                if (isExist) {
                    return val;
                }
            });
        }
        // Remove undefined
        filteredData = filteredData.filter(data => data);
        // Compose final data into object
        let finalData = {};
        filteredData.forEach(el => {
            Object.keys(el).map(key => {
                finalData[key] = el[key];
            });
        });
        // Get the id and the transaction
        const txnId = finalData.Key;
        let value = JSON.parse(finalData.Record.value);
        let nameVal = '';
        for (let val in value) {
            nameVal = val;
        }
        await contract.submitTransaction(
            'updateVote',
            txnId,
            JSON.stringify({
                [nameVal]: 0
            })
        );
        res.sendStatus(200);
    });
};
