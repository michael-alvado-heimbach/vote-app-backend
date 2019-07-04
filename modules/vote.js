const pathFunction = require('path');
const { FileSystemWallet, Gateway } = require('fabric-network');
const WALLET_NAME = 'wallet';
const USER_NAME = 'user1';
const NETWORK_NAME = 'mychannel';
const CONTRACT_NAME = 'voting-app-backend';
const ERROR_MESSAGE_USER_NOT_EXIST =
	'An identity for the user "user1" does not exist in the wallet \n Run the registerUser.js application before retrying';
const LOCAL_FABRIC_CONNECTION = './../local_fabric_connection.json';
const TRANSACTION_PREFIX = 'vote';
const TRANSACTION_GET_ALL_VOTE = 'getAllVote';
const TRANSACTION_GET_LAST_VOTE = 'getLastVote';
const TRANSACTION_CREATE_VOTE = 'createVote';
const TRANSACTION_UPDATE_VOTE = 'updateVote';
const TRANSACTION_DELETE_CANDIDATE = 'deleteVote';

const getAllVotes = async () => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        let convertedVotes = '';
        if (Array.isArray(votes)) {
            // Because values inside votes is string
            convertedVotes = convertEachElementToObject(votes);
        }
        let votesObject = convertArrayToObject(convertedVotes);
        return votesObject;
    } catch (error) {
        throw error;
    }
};

const createNewVotingCandidate = async candidateName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateExist = isVoteCandidateExist(candidateName, votes);
        if (!candidateExist) {
            const rawLastVote = await currentContract.submitTransaction(
                TRANSACTION_GET_LAST_VOTE
            );
            const lastVote = convertRawVotesToArray(rawLastVote);
            let voteId = '';
            if (isVoteEmpty(lastVote)) {
                voteId = createFirstVoteId();
            } else {
                voteId = createNewVoteId(lastVote);
            }
            await currentContract.submitTransaction(
                TRANSACTION_CREATE_VOTE,
                voteId,
                createEmptyVotingCandidate(candidateName)
            );
        }
    } catch (error) {
        throw error;
    }
};

const voteCandidate = async (voter, candidate) => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateArray = getCandidate(candidate, votes);
        const candidateObject = convertArrayToObject(candidateArray);
        const candidateTransactionId = getVoteTransactionId(candidate, votes);
        const newTotalVote = addAVote(candidateObject, candidate);
        await currentContract.submitTransaction(
            TRANSACTION_UPDATE_VOTE,
            candidateTransactionId,
            updateCandidateTotalCount(candidate, candidateObject, newTotalVote)
        );

        // Borrow function get candidate to get a voter
        const voterArray = getCandidate(voter, votes);
        const voteObject = convertArrayToObject(voterArray);
        const voteTransactionId = getVoteTransactionId(voter, votes);
        await currentContract.submitTransaction(
            TRANSACTION_UPDATE_VOTE,
            voteTransactionId,
            updateVoterVoteStatus(voter, voteObject)
        );
    } catch (error) {
        throw error;
    }
};

const removeVote = async candidateName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateArray = getCandidate(candidateName, votes);
        const candidateObject = convertArrayToObject(candidateArray);
        const candidateTransactionId = getVoteTransactionId(
            candidateName,
            votes
        );
        const newTotalVote = removeAVote(candidateObject, candidateName);
        await currentContract.submitTransaction(
            TRANSACTION_UPDATE_VOTE,
            candidateTransactionId,
            updateCandidateTotalCount(
                candidateName,
                candidateObject,
                newTotalVote
            )
        );
    } catch (error) {
        throw error;
    }
};

const resetVote = async candidateName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateArray = getCandidate(candidateName, votes);
        const candidateObject = convertArrayToObject(candidateArray);
        const candidateTransactionId = getVoteTransactionId(
            candidateName,
            votes
        );
        await currentContract.submitTransaction(
            TRANSACTION_UPDATE_VOTE,
            candidateTransactionId,
            resetCandidate(candidateName)
        );
    } catch (error) {
        throw error;
    }
};

const deleteCandidate = async candidateName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateTransactionId = getVoteTransactionId(
            candidateName,
            votes
        );
        await currentContract.submitTransaction(
            TRANSACTION_DELETE_CANDIDATE,
            candidateTransactionId
        );
    } catch (error) {
        throw error;
    }
};

const candidateDetail = async candidateName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        const candidateArray = getCandidate(candidateName, votes);
        const candidateObject = convertArrayToObject(candidateArray);
        return candidateObject;
    } catch (error) {
        throw error;
    }
};

const getFilteredVotes = async voterName => {
    try {
        const currentContract = await getCurrentContract();
        const rawVotes = await currentContract.evaluateTransaction(
            TRANSACTION_GET_ALL_VOTE
        );
        const votes = convertRawVotesToArray(rawVotes);
        let convertedVotes = '';
        if (Array.isArray(votes)) {
            // Because values inside votes is string
            convertedVotes = convertEachElementToObject(votes);
        }
        let votesObject = convertArrayToObject(convertedVotes);
        delete votesObject[voterName];
        return votesObject;
    } catch (error) {
        throw error;
    }
};

const getCppPath = () => {
    return pathFunction.resolve(__dirname, LOCAL_FABRIC_CONNECTION);
};

const getWalletPath = path => pathFunction.join(process.cwd(), path);

const getCurrentWallet = async () => {
    try {
        const walletPath = getWalletPath(WALLET_NAME);
        const wallet = new FileSystemWallet(walletPath);
        const userExists = await wallet.exists(USER_NAME);
        if (!userExists) {
            throw ERROR_MESSAGE_USER_NOT_EXIST;
        }
        return wallet;
    } catch (error) {
        throw error;
    }
};

const getCurrentContract = async () => {
    try {
        const wallet = await getCurrentWallet();
        const gateway = new Gateway();
        const ccpPath = getCppPath();
        await gateway.connect(ccpPath, {
            wallet,
            identity: USER_NAME,
            discovery: { enabled: true, asLocalhost: true }
        });
        const network = await gateway.getNetwork(NETWORK_NAME);
        const contract = network.getContract(CONTRACT_NAME);
        return contract;
    } catch (error) {
        throw error;
    }
};

const convertRawVotesToArray = votes => {
    const parsedVotes = JSON.parse(votes.toString());
    return JSON.parse(parsedVotes);
};

const convertArrayToObject = votes => {
    let object = {};
    votes.forEach(vote => {
        Object.keys(vote).map(propertiesName => {
            object[propertiesName] = vote[propertiesName];
        });
    });
    return object;
};

const convertEachElementToObject = votes => {
    return votes.map(vote => JSON.parse(vote.Record.value));
};

const isVoteCandidateExist = (name, votes) => {
    let isExist = false;
    if (Array.isArray(votes)) {
        votes.map(rawVote => {
            const vote = JSON.parse(rawVote.Record.value);
            Object.keys(vote).map(propertiesName => {
                if (propertiesName === name) {
                    isExist = true;
                }
            });
        });
    }
    return isExist;
};

const isVoteEmpty = vote => {
    return vote && Object.keys(vote).length === 0;
};

const createFirstVoteId = () => {
    return TRANSACTION_PREFIX + '0';
};

const createNewVoteId = lastVote => {
    const lastVoteTransactionId = lastVote.Key;
    let lastVoteId = parseInt(lastVoteTransactionId.substring(4));
    lastVoteId++;
    return TRANSACTION_PREFIX + lastVoteId;
};

const createEmptyVotingCandidate = name => {
    return JSON.stringify({
        [name]: {
            totalCount: 0,
            vote: false
        }
    });
};

const filterCandidates = (name, votes) => {
    let isExist = false;
    let candidates = [];
    if (Array.isArray(votes)) {
        candidates = votes.map(rawVote => {
            let vote = JSON.parse(rawVote.Record.value);
            isExist = false;
            for (let propertiesName in vote) {
                if (propertiesName === name) {
                    isExist = true;
                }
            }
            if (isExist) {
                return vote;
            }
        });
    }
    return candidates;
};

const getCandidate = (name, votes) => {
    const candidates = filterCandidates(name, votes);
    return candidates.filter(candidate => candidate);
};

const addAVote = (candidate, name) => {
    const currentVoteTotal = candidate[name].totalCount;
    const newVoteTotal = currentVoteTotal + 1;
    return newVoteTotal;
};

const getVoteTransactionId = (name, votes) => {
    const rawCandidateDirty = getRawCandidate(name, votes);
    const rawCandidate = rawCandidateDirty.filter(candidate => candidate);
    return rawCandidate[0].Key;
};

const getRawCandidate = (name, votes) => {
    let isExist = false;
    let candidate = [];
    candidate = votes.map(rawVote => {
        let vote = JSON.parse(rawVote.Record.value);
        isExist = false;
        for (let propertiesName in vote) {
            if (propertiesName === name) {
                isExist = true;
            }
        }
        if (isExist) {
            return rawVote;
        }
    });
    return candidate;
};

const updateCandidateTotalCount = (
    candidateName,
    candidateObject,
    newTotalVote
) => {
    return JSON.stringify({
        [candidateName]: {
            totalCount: newTotalVote,
            vote: candidateObject[candidateName].vote
        }
    });
};

const updateVoterVoteStatus = (voterName, voteObject) => {
    return JSON.stringify({
        [voterName]: {
            totalCount: voteObject[voterName].totalCount,
            vote: true
        }
    });
};

const removeAVote = (candidate, name) => {
    const currentVoteTotal = candidate[name].totalCount;
    const newVoteTotal = currentVoteTotal < 0 ? 0 : currentVoteTotal - 1;
    return newVoteTotal;
};

const resetCandidate = candidateName => {
    return JSON.stringify({
        [candidateName]: {
            totalCount: 0,
            vote: false
        }
    });
};

module.exports = {
    getAllVotes,
    createNewVotingCandidate,
    voteCandidate,
    removeVote,
    resetVote,
    deleteCandidate,
    candidateDetail,
    getFilteredVotes
};
