require.config({
	paths: {
		'accounting': '../components/accounting/accounting',
		'backbone': '../components/backbone/backbone',
		'localStorage': '../components/backbone.localStorage/backbone.localStorage',
		'bootstrap': 'vendor/bootstrap',
		'jquery': '../components/jquery/jquery',
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
 * LOADS THE DEPENDENCIES FOR THIS APP AND PASSES THEM TO A CALLBACK
*/
require(['jquery', 'underscore', 'marionette', 'backbone', 'accounting', 'localStorage', 'stickit'],
	function ($, _, Marionette, Backbone, accounting) {
		'use strict';

		/**
		 * 
		 * MAKE UP YOUR OWN FUND HERE
		 *
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
		app.on("initialize:after", function() {
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

			this.loadDonations = function() {
				app.investTable.show(new InvestmentTable({ collection: app.investmentList }));
			};

			app.vent.on('add:investment', function() {
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
				'': 'loadDonations'
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
		var ControlBar = Marionette.ItemView.extend({
			events: {
				'click .add-investment': 'addDonation',
				'click .submit-investments': 'submitDonations'
			},
			template: _.template($('#tpl-control-bar').html()),
			onRender: function() {
				this.displayTotal(app.investmentList.totalAll());
				this.listenTo(app.investmentList, 'change:total', this.displayTotal);
			},
			addDonation: function() {
				app.vent.trigger('add:investment');
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
			ui: { fundDescription: '.fund-description' },
			template: _.template($('#tpl-investment-box').html()),
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
			itemView: InvestmentBox
		});


		/**
		 *
		 * 
		 * DEFINE THE OBJECTS IN OUR PROBLEM DOMAIN
		 *
		 * 
		 */
		var Investment = Backbone.Model.extend({
			defaults:{
				amount: 0,
				fund: 'General Fund'
			}
		});

		var InvestmentList = Backbone.Collection.extend({
			model: Investment,
			// localStorage: new Backbone.LocalStorage('semjs-investments'),
			total: 0,
			url: 'http://pampang09.wesavebest.com/semjs/investments',
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
