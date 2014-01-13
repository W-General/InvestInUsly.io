/**
 * JUST A REQUIREJS CONFIGURATION, NOTHING EXCITING
 */

require.config({
	paths: {
		'accounting': '../components/accounting/accounting',
		'backbone': '../components/backbone/backbone',
		'bootstrap': 'vendor/bootstrap',
		'jquery': '../components/jquery/jquery',
		'localStorage': '../components/backbone.localStorage/backbone.localStorage',
		'marionette': '../components/backbone.marionette/lib/backbone.marionette',
		'stickit': '../components/backbone.stickit/backbone.stickit',
		'underscore': '../components/underscore/underscore'
	},
	shim: {
		underscore: {
			exports: '_'
		},
		backbone: {
			deps: ['jquery', 'underscore'],
			exports: 'Backbone'
		},
		localStorage: {
			deps: ['backbone']
		},
		bootstrap: {
			deps: ['jquery'],
			exports: 'jquery'
		},
		marionette: {
			deps: ['backbone'],
			exports: 'Backbone.Marionette'
		},
		stickit: {
			deps: ['backbone']
		}
	}
});


/**
 * PLEASE IGNORE EVERYTHING UP TO THIS POINT
 * LOADS THE DEPENDENCIES FOR THIS APP AND PASSES THEM TO A CALLBACK
*/
require(['jquery', 'underscore', 'marionette', 'backbone', 'accounting', 'localStorage', 'stickit'],
	function ($, _, Marionette, Backbone, accounting) {
		'use strict';

		/**
		 * 
		 * 1. MAKE UP YOUR OWN FUND HERE
		 * Make sure it has at least a name
		 */
		var fundList = [
			{
				"name": "Buildin' Stuff",
				"info": "We'll build amazing products. (No terrible Bootstrap sites)."
			},
			{
				"name": "General Fund",
				"info": "Odds and ends, this and that"
			},
			{
				"name": "Office Stuff",
				"info": "Mostly Macbook Pros, maybe some paper and stuff"
			}
		];

		/**
		 * 
		 * SETTING UP THE APPLICATION OBJECT
		 * 
		 */
		var app = new Marionette.Application();

		app.__startHistory = function() {
			if (Backbone.history) {
				Backbone.history.start();
			}
		};

		// CREATE A NEW COLLECTION
		app.addInitializer(function() {
			this.investmentList = new InvestmentList();
		});

		// LAYOUT THE DIFFERENT SECTIONS IN OUR APP
		app.addRegions({
			controlBar: '#control-bar',
			investTable: '#investment-list'
		});

		// BEST PRACTICE TO START BACKBONE HISTORY AFTER ALL INITIALIZERS
		app.on('initialize:after', function() {
			var jqXHR = this.investmentList.fetch();

			jqXHR.always(this.__startHistory);

			this.controlBar.show(new ControlBar());
		});

		/**
		 *
		 * 
		 * SET UP THE CONTROLLER
		 * IT'S JUST A FUNCTION, NOTHING SPECIAL
		 *
		 * 
		 */
		app.controller = function() {

			this.showInvestments = function() {
				app.investTable.show(new InvestmentTable({ collection: app.investmentList }));
			};

			/**
			 * 2.A. PUB/SUB
			 * Listen to the event triggered when a user adds another investment (you come up with the name and remember it)
			 */
			app.vent.on(/* ADD YOUR CUSTOM EVENT NAME HERE */, function() {
				app.investmentList.add(new Investment());
			});
		};

		/**
		 *
		 * 
		 * SET UP THE ROUTER AND SPECIFY THE CONTROLLER
		 *
		 * 
		 */
		app.router = new Marionette.AppRouter({
			appRoutes: {
				'': 'showInvestments'
			},
			controller: new app.controller()
		});

		/**
		 *
		 * 
		 * SET UP VIEWS
		 *
		 * 
		 */


		// DEFINES THE CONTROL BAR WITH BUTTONS AND INVESTMENT TOTAL IN IT
		var ControlBar = Marionette.ItemView.extend({
			events: {
				'click .add-investment': 'onAddInvestment',
				'click .submit-investments': 'onSubmitInvestments'
			},
			template: _.template($('#tpl-control-bar').html()),
			onRender: function() {
				this.displayTotal(app.investmentList.totalAll());
				this.listenTo(app.investmentList, 'change:total', this.displayTotal);
			},
			onAddInvestment: function() {

				/**
				 * 2.B. PUB / SUB
				 * Trigger the event
				 * Hint: This name should be familiar.
				 */
				app.vent.trigger(/* PUT EVENT NAME HERE */);
			},
			displayTotal: function (total) {
				this.$('#investment-total').text(accounting.formatMoney(total));
			}
		});


		// DEFINES A SINGLE INVESTMENT BOX VIEW
		var InvestmentBox = Marionette.ItemView.extend({
			className: 'investment-box',
			bindings: {
				'.investment-amount': {
					observe: 'amount',
					events: ['blur'],
					onSet: function (val) { 
						return $.isNumeric(val) ? parseFloat(val) : 0;
					}
				},
				'.fund-list': {
					observe: 'fund',
					selectOptions: {
						collection: fundList,
						labelPath: 'name',
						valuePath: 'name'
					}
				}
			},
			events: { 'click .delete-investment': 'onDelete' },
			modelEvents: { 'change:fund': '__setFundDescription' },
			template: _.template($('#tpl-investment-box').html()),
			ui: { fundDescription: '.fund-description' },
			onRender: function() {
				this.stickit();
				this.__setFundDescription();
			},
			onDelete: function() {
				var box = this;

				this.$el.fadeOut(function() {
					box.model.destroy();
				});
			},
			__setFundDescription: function() {
				var newFund = _.findWhere(fundList, { name: this.model.get('fund') });
				
				this.ui.fundDescription.fadeOut(function() {
					var newText = 'The money will wind up somewhere.';

					if (newFund) { newText = newFund.info; }
					
					$(this).text(newText).fadeIn();
				});
			}
		});

		// A VIEW TO SHOW A LIST OF INVESTMENTS
		var InvestmentTable = Marionette.CollectionView.extend({
			emptyView: Marionette.ItemView.extend({
				template: _.template('Please invest something...please. :)')
			}),
			
			/**
			 * 3. VIEWS
			 * Add an "itemView" parameter to this configuration object
			 * And reference the "InvestmentBox" class as the item view
			 */
			
		});


		/**
		 *
		 * 
		 * DEFINE THE OBJECTS IN OUR PROBLEM DOMAIN
		 *
		 * 
		 */
		
		/**
		 * 4. DEFINE YOUR DOMAIN
		 * Create an Investment model by extending Backbone's Model base class
		 * Pass a 'defaults' object to the configuration and define reasonable defaults for "amount" and "fund" fields
		 */


		var InvestmentList = Backbone.Collection.extend({
			model: Investment,
			total: 0,

			/**
			 * 5. PERSISTENCE
			 * If you can run this web app off a server, you can use the full CORS REST suite.
			 * However, if this is being run from a file:// protocol, you must use local storage.
			 */
			// localStorage: new Backbone.LocalStorage('semjs-investments'),
			// url: 'http://pampang09.wesavebest.com/semjs/investments', 

			initialize: function() {
				this.on('add remove change:amount',this.totalAll);
				this.on('change', function (model) { model.save(); });
			},
			totalAll: function() {
				var newTotal = this.reduce(function (memo, model) {
					return memo + model.get('amount');
				}, 0);

				if (this.total !== newTotal) {
					this.total = newTotal;
					this.trigger('change:total', this.total);
				}

				return this.total;
			}
		});

		/**
		 * LET'S GO!
		 */
		app.start();
	}
);
