import assert from 'assert';
import vote from './../modules/vote';

const addFunction = vote.add;

describe('Vote', function() {
	describe('#add(numberOne, numberTwo)', function() {
		it('should return 3 when numberOne is 1 and numberTwo is 2', function() {
			assert.equal(addFunction(1, 2), 3);
		});
	});
});
