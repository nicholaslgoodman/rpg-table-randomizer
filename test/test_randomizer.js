'use strict';

const expect = require('chai').expect;

const rpg_table_randomizer = require('../src/index.js');
const randomizer = rpg_table_randomizer.randomizer;
const npc_generator = rpg_table_randomizer.npc_generator;
const random_name = rpg_table_randomizer.random_name;
const RandomTable = rpg_table_randomizer.RandomTable;
const TableNormalizer = rpg_table_randomizer.TableNormalizer;
const r_helpers = rpg_table_randomizer.r_helpers;

const test_tables = require('./test.json');
const mission_tables = require('../sample/colonial_mission.json');

const tables = {};

test_tables.forEach((t) => {
	tables[t.key] = new RandomTable(t);
});

describe('Randomizer module', function (){
	
	beforeEach(function () {
		randomizer.setTableKeyLookup(function(key){
			return tables[key] ? tables[key] : null;
		});
	});
	
	describe('random function', function() {
		it('should return a number between min and max', function () {
			expect(randomizer.random(1,4)).to.be.within(1,4);
			expect(randomizer.random(4)).to.be.within(0,4);
		});
	});
	
	describe('getWeightedRandom function', function (){
		let values = [
			'red',
			'orange',
			'yellow'
		];
		let weights = [
			1,
			2,
			3
		];
		it('should return one of the values', function () {
			expect(randomizer.getWeightedRandom(values, weights)).to.be.oneOf(values);
		});
	});
	
	describe('rollRandom function', function (){
		const results = [
			'red',
			'orange',
			'yellow'
		];
		let data = [
			'red',
			'orange',
			'yellow'
		];
		it('should return one of the values from an array of strings', function () {
			expect(randomizer.rollRandom(data)).to.be.oneOf(results);
		});
		data = [
			{ label: 'red', weight: 2 },
			{ label: 'orange', weight: 6 },
			{ label: 'yellow', weight: 1 }
		];
		it('should return one of the values from an array of objects', function () {
			expect(randomizer.rollRandom(data)).to.be.oneOf(results);
		});
		data = {
			'red': { weight: 2 },
			'orange': { weight: 6 },
			'yellow': { weight: 1 }
		};
		it('should return one of the vales from an object', function () {
			expect(randomizer.rollRandom(data)).to.be.oneOf(results);
		});
	});
	
	// these are pretty basic but should be ok if we also are testing the other modules and methods
	describe('findToken function', function (){
		it('should find the tokens and convert them', function () {
			expect(randomizer.findToken('this is a token {{fake:token}}', '')).to.equal('this is a token {{fake:token}}');
			//roll
			expect(randomizer.findToken('this is a token {{roll:d1}}', '')).to.equal('this is a token 1');
			//table
			expect(randomizer.findToken('this is a token {{table:one}}', '')).to.equal('this is a token One');
			//subtable
			expect(randomizer.findToken('this is a token {{table:one:two}}', '')).to.equal('this is a token Two: Two');
		});
	});
	
	describe('roll function', function (){
		it('should return the expected range of numbers', function () {			
			expect(randomizer.roll()).to.be.equal('');
			expect(randomizer.roll('d4')).to.be.within(1, 4);
			expect(randomizer.roll('1d4')).to.be.within(1, 4);
			expect(randomizer.roll('2d4')).to.be.within(2, 8);
			expect(randomizer.roll('1d4+0')).to.be.within(1, 4);
			expect(randomizer.roll('d4+1')).to.be.within(2, 5);
			expect(randomizer.roll('1d4+1')).to.be.within(2, 5);
			expect(randomizer.roll('1d4+3')).to.be.within(4, 7);
			expect(randomizer.roll('1d4-1')).to.be.within(0, 3);
			expect(randomizer.roll('1d4*2')).to.be.within(2, 8);
			expect(randomizer.roll('d4/2')).to.be.within(1, 2);
			expect(randomizer.roll('d6/2')).to.be.within(1, 3);
			expect(randomizer.roll('1d6/2')).to.be.within(1, 3);
		});
	});

	describe('getTableByKey function', function (){
		it('should return based on the titlelookup function', function () {
			expect(randomizer.getTableByKey('the table')).to.equal(null);
			expect(randomizer.getTableByKey('color')).to.equal(tables['color']);
		});
	});
		
	describe('setTableKeyLookup function', function (){
		it('should return the function result', function () {
			let func = function (title){ return `hello ${title}`; };
			randomizer.setTableKeyLookup(func);
			expect(randomizer.getTableByKey).to.equal(func);
		});
	});
	
	describe('registerTokenType function', function (){
		it('should return the right table type function', function () {
			let func = function(bark){ return `${bark} bark`;};
			randomizer.registerTokenType('bark', func);
			expect(randomizer.token_types['bark']).to.equal(func);
		});
	});
	
	describe('roll tokentype function', function(){
		it('should return the right range of numbers', function () {
			expect(randomizer.token_types['roll'](['roll', 'd6'], '{{roll:d6}', 'something')).to.be.within(1,6);
			expect(randomizer.token_types['roll'](['roll', '2d6+3'], '{{roll:2d6+3}', 'something')).to.be.within(5,15);
		});
	});
	
	//test the registered token type?
	describe('table tokentype function', function(){
		it('should return a random result from the table', function () {
			expect(randomizer.token_types['table'](['table', 'color'], '{{table:color}}', 'something')).to.be.oneOf(tables['color'].tables.default);
		});
		
		it('should return a random result from a subtable', function () {
			let laborers = tables['colonial_occupations'].tables.laborer.map((v) => { return v.label; });
			const result = randomizer.token_types['table'](['table', 'colonial_occupations', 'laborer'], '{{table:colonial_occupations:laborer}}', 'something');
			const i = result.split(':').pop().trim();
			expect(i).to.be.oneOf(laborers);
			
			expect(randomizer.token_types['table'](['table', 'one*2'], '{{table:one*2}}', 'something')).to.be.equal('One, One');
			expect(randomizer.token_types['table'](['table', 'one', 'two*3'], '{{table:one:two*3}}', 'something')).to.be.equal('Two: Two, Two: Two, Two: Two');
		});
	});
	
	describe('getTableResult function', function(){
		it('should return a result', function () {
			const result = randomizer.getTableResult(tables['one']);
			expect(result).to.have.lengthOf(1);
			expect(result.shift()).to.have.property('result', 'one');
		});
		
		it('should return a sequence of results', function () {
			const result = randomizer.getTableResult(tables['color2']);
			expect(result).to.have.lengthOf(2);
			expect(result.shift()).to.have.property('result', 'Light');
			expect(result.shift()).to.have.property('result', 'Blue');
		});
	});
	
	describe('selectFromTable function', function(){
		it('should return a result', function () {
			const result = randomizer.getTableResult(tables['one'], 'two');
			expect(result).to.have.lengthOf(1);
			expect(result.shift()).to.have.property('result', 'two');
		});
	});
	
	

	describe('complicated group of tables linked together', function () {
		mission_tables.forEach((t) => {
			tables[t.key] = new RandomTable(t);
		});
		
		it('should return results from a number of tables', function () {
			const result = randomizer.getTableResult(tables['mission_generator']);
			// console.log( result );
			expect(result).to.be.an('array');
			expect(result.shift()).to.have.property('table', 'mission_action');
			expect(result.shift()).to.have.property('table', 'mission_patron');
			expect(result.shift()).to.have.property('table', 'mission_antagonist');
			expect(result.shift()).to.have.property('table', 'mission_complication');
			expect(result.shift()).to.have.property('table', 'mission_reward');
		});
		
	});
		
});
