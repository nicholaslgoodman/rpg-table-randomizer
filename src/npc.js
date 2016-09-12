'use strict';

/**
 * npc_gen: pass in the randomizer so we can return an object that can use the shared randomizer instance
 * @return {Object} npc functions
 */
module.exports = function npc_gen (randomizer) {
	/**
	 * Object to store NPC constructors.
	 * each constructor (except the base one) is based on a schema
	 */
	const NPC = {};
	/**
	 * The base prototype for NPC constructors. From this schemas are used to make differing constructions
	 */
	NPC.Base = function () { };
	/**
	 * Just a unique identifier that can be used for storage/retrieval
	 */
	NPC.Base.prototype.id = 0;
	/**
	 * Name of the schema used for the NPC
	 */
	NPC.Base.prototype.schema = '';
	/**
	 * The NPC's fields as set by the schema
	 */
	NPC.Base.prototype.fields = {};
	/**
	 * Schema assigned helper functions
	 */
	NPC.Base.prototype.helpers = {};
	/**
	 * set defaults on the fields
	 * usually this would involve calling random tables
	 */
	NPC.Base.prototype.initialize = function () {
		const schema_fields = Schemas[this.schema].fields;
		const fields = Object.keys(this.fields);
		fields.forEach((f) => {
			const sch = schema_fields.find((v) => { return v.key === f; });
			if (sch) {
				if (sch.default) {
					this.fields[f] = sch.default;
					return;
				}
				if (sch.source && sch.source !== '') {
					// parse source into something randomizer can use...
					const src_temp = (typeof sch.source === 'function') ? sch.source.call(this) : sch.source;
					// console.log(src_temp);
					if (sch.type === 'array') {
						const ct = (sch.count) ? sch.count : 1; // ???
						for (let i = 0; i < ct; i++) {
							this.fields[f].push(randomizer.convertToken(src_temp));
						}
					} else {
						this.fields[f] = randomizer.convertToken(src_temp);
					}
				}
			}
		});
		
		return 'initted';
	};
	
	/**
	 * Object store for registered schemas
	 */
	const Schemas = {};
	
	/**
	 * function to make a new NPC constructor
	 * constructor is added to NPC[schemaname]
	 * @param {Object} schema NPC schema object to base on the constructor
	 * @return {null}
	 */
	const registerSchema = function (schema) {
		if (!schema.name || schema.name === 'base') {
			return null;
			// throw exception?
		}
		// store it for later reference
		Schemas[schema.name] = schema;
		// add this schema to the NPC object so we can use it as a constructor
		// this could overwrite is that ok?
		const Base = NPC[schema.name] = function () {
			// in case we add something to NPC constructor that we need to call?
			// NPC.Base.call(this);
		};
		Base.prototype = new NPC.Base();
		Base.prototype.constructor = Base;
		Base.prototype.schema = schema.name;
		
		// initialize schema properties...
		schema.fields.forEach((f) => {
			let default_ = null;
			switch (f.type) {
				case 'string':
				case 'text':
					default_ = '';
					break;
				case 'array':
					default_ = [];
					break;
				case 'number':
				case 'modifier':
					default_ = 0;
					break;
				case undefined:
					// ?
					break;
			}
			Base.prototype.fields[f.key] = default_;
		});
		
		const helpers = Object.keys(schema.helpers);
		helpers.forEach((h) => {
			if (typeof schema.helpers[h] === 'function') {
				Base.prototype.helpers[h] = schema.helpers[h];
			}
		});
	};
	
	// return the NPC object of constructors and the registerSchema function
	return {
		NPC: NPC,
		registerSchema: registerSchema
	};
};
