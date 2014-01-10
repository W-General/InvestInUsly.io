require.config({
	paths: {
		'accounting': '../components/accounting/accounting',
		'backbone': '../components/backbone/backbone',
		'localStorage': '../components/backbone.localStorage/backbone.localStorage',
		'bootbox': '../components/bootbox/bootbox',
		'bootstrap': 'vendor/bootstrap',
		'jquery': '../components/jquery/jquery',
		'marionette': '../components/backbone.marionette/lib/backbone.marionette',
		'stickit': '../components/backbone.stickit/backbone.stickit',
		'text': '../components/requirejs-text/text',
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
		bootbox: {
			deps: ['bootstrap'],
			exports: 'bootbox'
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
require(['jquery', 'underscore', 'marionette', 'backbone', 'accounting', 'bootbox', 'text!data/funds.json', 'localStorage', 'stickit'],
	function ($, _, Marionette, Backbone, accounting, bootbox, funds) {
		'use strict';

		var fundList = JSON.parse(funds);

		/**
		 * SETTING UP THE APPLICATION OBJECT
		 */
		var app = new Marionette.Application();

		app.__startHistory = function() {
			if (Backbone.history) {
				Backbone.history.start();
			}
		};

		// FETCH THE COLLECTION FROM STORAGE
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
		 * SET UP THE CONTROLLER
		 * IT'S JUST A FUNCTION, NOTHING SPECIAL
		 */
		app.controller = function (appObject) {

			this.loadDonations = function() {
				appObject.investTable.show(new InvestmentTable({ collection: appObject.investmentList }));
			};

			app.vent.on('add:investment', function() {
				appObject.investmentList.add(new Investment());
			});
		};

		/**
		 * SET UP THE ROUTER AND SPECIFY THE CONTROLLER
		 */
		app.router = new Marionette.AppRouter({
			appRoutes: {
				'': 'loadDonations'
			},
			controller: new app.controller(app)
		});

		/**
		 * SET UP VIEWS
		 */
		var ControlBar = Marionette.ItemView.extend({
			events: {
				'click .add-investment': 'addDonation',
				'click .submit-investments': 'submitDonations'
			},
			template: _.template($('#tpl-control-bar').html()),
			addDonation: function() {
				app.vent.trigger('add:investment');
			}
		});

		var InvestmentBox = Marionette.ItemView.extend({
			className: 'investment-box',
			bindings: {
				'.investment-amount': 'amount',
				'.fund-list': {
					observe: 'fund',
					selectOptions: {
						collection: fundList,
						labelPath: 'name',
						valuePath: 'name'
					}
				}
			},
			modelEvents: {
				'change:fund': '__setFundDescription'
			},
			ui: {
				fundDescription: '.fund-description'
			},
			template: _.template($('#tpl-investment-box').html()),
			onRender: function() {
				this.stickit();
			},
			__setFundDescription: function() {
				var newText = _.findWhere(fundList, { name: this.model.get('fund') }).info;
				
				this.ui.fundDescription.fadeOut(function() {
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
		 * DEFINE THE OBJECTS IN OUR PROBLEM DOMAIN
		 */
		var Investment = Backbone.Model.extend({
			defaults:{
				amount: 0,
				fund: 'General Fund'
			}
		});

		var InvestmentList = Backbone.Collection.extend({
			model: Investment,
			localStorage: new Backbone.LocalStorage('fund-designation'),
			total: 0,
			initialize: function() {
				this.on('add remove change:amount',this.totalAll);
				this.on('change',this.save);
			},
			totalAll: function() {
				var newTotal = this.reduce(function (memo, model) {
					return memo + model.get('amount');
				}, 0);

				if (this.total !== newTotal) {
					this.total = newTotal;
					this.trigger('change:total',this.total);
				}
			},
			save: function(model) {
				model.save();
			}
		});

		/**
		 * LET'S GO!
		 */
		app.start();
	}
);
