const vote = require('./vote');

const errorHandler = (response, error) => {
    console.log(error);
    response.status(500).send(error);
};

module.exports = app => {
    app.get('/votes', async (request, response) => {
        try {
            const votes = await vote.getAllVotes();
            response.status(200).send(votes);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.post('/vote/detail', async (request, response) => {
        try {
            const name = request.body.name;
            const votes = await vote.candidateDetail(name);
            response.status(200).send(votes);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.post('/vote/candidate', async (request, response) => {
        try {
            const name = request.body.name;
            await vote.createNewVotingCandidate(name);
            response.sendStatus(200);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.delete('/vote/candidate', async (request, response) => {
        try {
            const name = request.body.name;
            await vote.deleteCandidate(name);
            response.sendStatus(200);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.get('/vote', async (request, response) => {
        try {
            const name = request.query.name;
            const votes = await vote.getFilteredVotes(name);
            response.status(200).send(votes);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.post('/vote', async (request, response) => {
        try {
            const voter = request.body.voter;
            const candidate = request.body.candidate;
            await vote.voteCandidate(voter, candidate);
            response.sendStatus(200);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.delete('/vote', async (request, response) => {
        try {
            const name = request.body.name;
            await vote.removeVote(name);
            response.sendStatus(200);
        } catch (error) {
            errorHandler(response, error);
        }
    });

    app.post('/vote/reset', async (request, response) => {
        try {
            const name = request.body.name;
            await vote.resetVote(name);
            response.sendStatus(200);
        } catch (error) {
            errorHandler(response, error);
        }
    });
};
