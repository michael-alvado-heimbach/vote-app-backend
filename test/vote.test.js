const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../server');
const expect = chai.expect;

chai.use(chaiHttp);
chai.should();

describe('Vote', function() {
    it('should get all transaction record without a record', function(done) {
        chai.request(app)
            .get('/votes')
            .end(function(error, response) {
                response.should.have.status(200);
                response.body.should.be.a('object');
                assert(response.body, {});
                done();
            });
    });
    it('should get all transaction record with a record', function(done) {
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                chai.request(app)
                    .get('/votes')
                    .end(function(error, response) {
                        response.should.have.status(200);
                        response.body.should.be.a('object');
                        expect(
                            Object.keys(response.body).length
                        ).to.be.at.least(1);
                        done();
                    });
            });
    });
    it('should create a new voting candidate', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                response.should.have.status(200);
                response.body.should.be.a('object');
                done();
            });
    });
    it('should return detail of a voting candidate', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'test user1' })
            .end(function(error, response) {
                chai.request(app)
                    .post('/vote/detail')
                    .send({ name: 'test user1' })
                    .end(function(error, response) {
                        response.should.have.status(200);
                        response.body.should.be.a('object');
                        expect(response.body).not.to.be.empty;
                        done();
                    });
            });
    });
    it('should not return detail of a voting candidate that not exist', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/detail')
            .send({ name: 'michael lalalalalala' })
            .end(function(error, response) {
                response.should.have.status(200);
                response.body.should.be.a('object');
                expect(response.body).to.be.empty;
                done();
            });
    });
    it('should delete a voting candidate', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'test user1' })
            .end(function(error, response) {
                chai.request(app)
                    .delete('/vote/candidate')
                    .send({ name: 'test user1' })
                    .end(function(error, response) {
                        response.should.have.status(200);
                        response.body.should.be.a('object');
                        done();
                    });
            });
    });
    it('should vote a candidate', function(done) {
        this.timeout(20000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                chai.request(app)
                    .post('/vote/candidate')
                    .send({ name: 'daniel heimbach' })
                    .end(function(error, response) {
                        chai.request(app)
                            .post('/vote')
                            .send({
                                voter: 'daniel heimbach',
                                candidate: 'michael alvado'
                            })
                            .end(function(error, response) {
                                response.should.have.status(200);
                                response.body.should.be.a('object');
                                done();
                            });
                    });
            });
    });
    it('should vote a candidate', function(done) {
        this.timeout(20000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                chai.request(app)
                    .post('/vote/candidate')
                    .send({ name: 'daniel heimbach' })
                    .end(function(error, response) {
                        chai.request(app)
                            .post('/vote')
                            .send({
                                voter: 'daniel heimbach',
                                candidate: 'michael alvado'
                            })
                            .end(function(error, response) {
                                response.should.have.status(200);
                                response.body.should.be.a('object');
                                done();
                            });
                    });
            });
    });
    it('should get all transaction record filtered by user', function(done) {
        chai.request(app)
            .get('/vote?name=michael alvado')
            .end(function(error, response) {
                response.should.have.status(200);
                response.body.should.be.a('object');
                done();
            });
    });
    it('should remove a vote', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                chai.request(app)
                    .post('/vote/candidate')
                    .send({ name: 'daniel heimbach' })
                    .end(function(error, response) {
                        chai.request(app)
                            .post('/vote')
                            .send({
                                voter: 'daniel heimbach',
                                candidate: 'michael alvado'
                            })
                            .end(function(error, response) {
                                chai.request(app)
                                    .delete('/vote')
                                    .send({ name: 'michael alvado' })
                                    .end(function(error, response) {
                                        response.should.have.status(200);
                                        response.body.should.be.a('object');
                                        done();
                                    });
                            });
                    });
            });
    });
    it('should reset a voting candidate', function(done) {
        this.timeout(10000);
        chai.request(app)
            .post('/vote/candidate')
            .send({ name: 'michael alvado' })
            .end(function(error, response) {
                chai.request(app)
                    .post('/vote/candidate')
                    .send({ name: 'daniel heimbach' })
                    .end(function(error, response) {
                        chai.request(app)
                            .post('/vote')
                            .send({
                                voter: 'daniel heimbach',
                                candidate: 'michael alvado'
                            })
                            .end(function(error, response) {
                                chai.request(app)
                                    .post('/vote/reset')
                                    .send({ name: 'michael alvado' })
                                    .end(function(error, response) {
                                        response.should.have.status(200);
                                        response.body.should.be.a('object');
                                        done();
                                    });
                            });
                    });
            });
    });
});
