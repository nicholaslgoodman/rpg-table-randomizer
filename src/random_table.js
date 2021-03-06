'use strict';

const r_helpers = require('./r_helpers.js');

/**
 * RandomTable: Model for tables used by Randomizer
 * @param {Object} config the tables non-default attributes
 */
const RandomTable = function (config) {
	/**
	 * The primary attributes of this table
	 * @property {String} id id for the table, primary key for database if used
	 * @property {String} key identifier for the table
	 * @property {String} [title] title of the table
	 * @property {String} [author] author of the table
	 * @property {String} [description] description of the table
	 * @property {String} [source] source of the table
	 * @property {Array} [tags] subject tags
	 * @property {String|Array} [sequence] tables to roll on. if array it can be an array of strings (table names) or objects (two properties table: the table to roll on and times: the number of times to roll)
	 * @property {Array} [table] default table. array of strings or objects. removed after initialization.
	 * @property {Object} [tables] a property for each subtables. if table property is not set then the first propery of this Object is used to start rolling
	 * @property {Array} [macro] for tables that are only used to aggregate result from other tables, this array consists of table keys to be rolled on in order
	 * @property {Object} [print] objects to describe what parts of a (sub)table should be displayed in the results
	 * @property {Object} [print.default] how to display the default table's results
	 * @property {Object} [print.default.hide_table] set to 1 will not show the table name
	 * @property {Object} [print.default.hide_result] set to 1 will not show the result on that (sub)table
	 * @property {Object} [print.default.hide_desc] set to 1 will not show any description for a result on that (sub)table
	 * @property {Array} [dependencies] table keys that are needed to get full results from this table
	 * @property {Array} [result] current result array of objects
	 */
	this.id = 0;
	this.key = '';
	this.title = '';
	this.author = '';
	this.description = '';
	this.source = '';
	this.tags = [];
	this.sequence = ''; // where to start rolling and if other tables should always be rolled on
	this.tables = {};
	this.macro = [];
	this.dependencies = null;
	this.result = [];
	/**
	 * Run on first construction
	 * @param {Object} config data passed from the constructor
	 */
	const initialize = function (config) {
		for (const prop in config) {
			if (config.hasOwnProperty(prop)) {
				this[prop] = config[prop];
			}
		}
		// make sure this.tables.default is set instead of this.table
		// maybe we dont need this
		if (!r_helpers.isEmpty(this.table)) {
			const tables = this.tables;
			tables.default = this.table;
			this.tables = tables;
			delete this.table;
		}
		if (this.key === '') {
			this.key = this.id;
		}
	};
	/**
	 * validate fields before saving
	 * @param {Object} properties new attributes to save
	 * @returns {Object} error information
	 */
	this.validate = function (properties) {
		// console.log(attributes);
		const error = { fields: [], general: '' };
		
		if (properties.title === '') {
			error.fields.push({ field: 'title', message: 'Title cannot be blank' });
			error.general += 'Title cannot be blank. ';
		}
		
		if (r_helpers.isEmpty(properties.tables) && r_helpers.isEmpty(properties.macro)) {
			error.fields.push({ field: 'tables', message: 'Both Tables and Macro cannot be empty' });
			error.general += 'Both Tables and Macro cannot be empty. ';
		}
		
		if (!r_helpers.isEmpty(error.fields) || !r_helpers.isEmpty(error.general)) {
			return error;
		}
		return true;
	};
	/**
	 * Show the results as a string
	 * @todo make this nicer/clearer #23
	 * Alternate: write a template to use in the views?
	 * @param {Boolean} [simple=false] if true only output the first result label
	 * @returns {String} the results
	 */
	this.niceString = function (simple) {
		if (typeof simple === 'undefined') {
			simple = false;
		}
		const r = this.result; // array
		if (r_helpers.isString(r) || !Array.isArray(r) || r.length === 0) { return ''; }
		
		if (simple) { return r[0]['result']; } // @todo maybe use shift() instead, if editing this array won't be a problem. (else we could clone it...
		
		let o = '';
		const print_opt = (this.print) ? this.print : {};
		r.forEach((v) => {
			if (print_opt[v.table]) {
				if (!print_opt[v.table].hide_table || print_opt[v.table].hide_table === 0) {
					o += `${r_helpers.capitalize(v.table)}: `;
				}
				if (!print_opt[v.table].hide_result || print_opt[v.table].hide_result === 0) {
					o += `${r_helpers.capitalize(v.result)}\n`;
				}
				if (!print_opt[v.table].hide_desc || print_opt[v.table].hide_desc === 0) {
					if (v.desc !== '') { o += `${v.desc}\n`; }
				}
			} else {
				if (v.table === 'default') {
					o += `${r_helpers.capitalize(v.result)}\n`;
				} else {
					o += `${r_helpers.capitalize(v.table)}: ${r_helpers.capitalize(v.result)}\n`;
				}
				if (v.desc !== '') { o += `${v.desc}\n`; }
			}
		});
		o = o.trim(); // trim off final linebreak
		return o;
	};
	/**
	 * outputs the json data for the table (import/export)
	 * @param {Boolean} [editmode=false] if false empty properties will be stripped out
	 * @returns {Object} table attributes
	 */
	this.outputObject = function (editmode) {
		if (typeof editmode === 'undefined') { editmode = false; }
		// clone the data, this will strip out any functions too.
		const att = JSON.parse(JSON.stringify(this));
		const props = Object.keys(att);
		props.forEach((k) => {
			if (!editmode && r_helpers.isEmpty(att[k])) {
				delete att[k];
			}
		});
		// don't include results
		if (att.result && editmode) {
			att.result = [];
		} else if (att.result) {
			delete att.result;
		}
		delete att.id;
		return att;
	};
	/**
	 * outputs the json data for the table (import/export)
	 * @param {Boolean} [editmode=false] if false empty properties will be stripped out
	 * @param {Boolean} [compress=false] if true JSON will not have indentation, etc.
	 * @returns {String} table properties in JSON
	 */
	this.outputCode = function (editmode, compress) {
		if (typeof editmode === 'undefined') { editmode = false; }
		if (typeof compress === 'undefined') { compress = false; }
		
		const obj = this.outputObject(editmode);
		
		if (compress) {
			return JSON.stringify(obj);
		}
		return JSON.stringify(obj, null, 2);
	};
	/**
	 * Get an object result in case we only have the label and need other data from it
	 * @param {String} label The item we are looking for
	 * @param {String} [table=default] the table to search
	 * @returns {Object} the object associated with the label or an empty one
	 */
	this.findObject = function (label, table) {
		if (typeof table === 'undefined' || table === '') {
			table = 'default';
		}
		const t = this.tables[table];
		if (t[label]) {
			return t[label];
		}
		if (Array.isArray(t)) {
			const obj = t.find((v) => {
				return v.label === label;
			});
			return (typeof obj !== 'undefined') ? obj : {};
		}
		return {};
	};
	/**
	  * find the result element for a specific table/subtable
	  * only works if we have already generated a result
	  * @param {String} table The table to look for
	  * @returns {Object} result element for specified table (or empty)
	  */
	this.findResultElem = function (table) {
		if (typeof table === 'undefined' || table === '') {
			table = 'default';
		}
		const obj = this.result.find((v) => {
			return v.table === table;
		});
		return (typeof obj !== 'undefined') ? obj : {};
	};
	/**
	 * find the dependent tables to get full results for this table
	 * @return {Array} table keys
	 */
	this.findDependencies = function () {
		// check field first, if it's not null we'll trust it...?
		if (this.dependencies !== null) {
			return this.dependencies;
		}
		// iterate over the tables and look for table tokens
		let dep = [];
		const tokenRegExp = new RegExp('({{2}.+?}{2})', 'g');
		const tnames = Object.keys(this.tables);
		tnames.forEach((n) => {
			// n is sub/table name
			const table = this.tables[n];
			table.forEach((r) => {
				// r is object of table potential result
				if (!r.label) { return; }
				const tokens = r.label.match(tokenRegExp);
				if (tokens !== null) {
					tokens.forEach((token) => {
						const parts = token.replace('{{', '').replace('}}', '').split(':');
						if (parts.length > 1 && parts[0] === 'table' && parts[1] !== 'this') {
							dep.push(parts[1]);
						}
					});
				}
			});
		});
		dep = dep.reduce((a, b) => {
			if (a.indexOf(b) < 0) { a.push(b); }
			return a;
		}, []);
		this.dependencies = dep;
		return dep;
	};
	
	/**
	 * Initialize the table, set the data, normalize, etc.
	 */
	initialize.call(this, config);
};

module.exports = RandomTable;
