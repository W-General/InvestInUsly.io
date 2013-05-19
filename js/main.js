var app = app || {};

$(function() {
	"use strict";

	var dispatcher = _.clone(Backbone.Events),
		fundsPromise = $.get('funds.json').promise(),
		router;

	var getFunds = function(context,callback) {
		fundsPromise.done(function (data) {
			callback.call(context,data);
		});
	};

	var Designation = Backbone.Model.extend({
		defaults:{
			amount: 0,
			fund: 'General Fund',
			paypalId: 0
		}
	});

	var DesignationList = Backbone.Collection.extend({
		model: Designation,
		localStorage: new Backbone.LocalStorage('fund-designation'),
		initialize: function() {
			this.on('fetch remove change:amount',this.totalAll);
			this.on('add change',this.save);
		},
		destroyAll: function() {
			while (this.models.length > 0) {
				this.models[0].destroy();
			}
		},
		totalAll: function() {
			var newTotal = this.reduce(function (memo,model) {
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

	var DesignationApp = Backbone.View.extend({
		el:'#gift-app',
		$total: $('#gift-total'),
		$form: $('.gift-app-form'),
		deferRender: false,
		events: {
			'click .designation-add':'addComponentListener',
			'click .designation-clear-all': 'confirmClear',
			'submit .gift-app-form':'submitDonation'
		},
		initialize: function() {
			if (this.collection.length === 0) {
				this.collection.add(new Designation());
			}

			this.listenTo(this.collection,'change:total',this.updateTotalDisplay);
			this.listenTo(dispatcher,'designations.clear',this.deleteAll);
			this.listenTo(dispatcher,'donation.execute',this.submitDonation);
			this.render();
		},
		render: function() {
			_.each(this.collection.models, this.addComponent, this);
		},
		addComponentListener: function() {
			var designation = new Designation();
			this.collection.add(designation);
			this.addComponent(designation);
		},
		addComponent: function(model) {
			var $component;

			$component = new DesignationComponent({'model':model}).render().$el.hide();

			this.$('#component-wrapper').append($component);
			$component.fadeIn();
		},
		confirmClear: function () {
			bootbox.dialog("Are you sure you want to get rid of all you current designations?",
			[
				{
					"label" : "No, don't erase them.",
					"class" : "btn-success"
				}, {
					"label" : "Yes, clear them.",
					"class" : "btn-danger",
					"callback": function() { dispatcher.trigger('designations.clear'); }
				}
			]);
		},
		deleteAll: function () {
			this.collection.destroyAll();
		},
		prepareForm: function(total) {
			this.$('input[name=amount]').val(total);
			// submit an ajax write to the db to record this transaction
			// update the return URL with the donation ID as a GET param
			// clear out local storage so that this donation ID is unique
		},
		updateTotalDisplay: function (total) {
			this.$total.fadeOut(350,function() {
				$(this).text(accounting.formatMoney(total)).fadeIn(350);
			});
		},
		submitDonation: function() {

			if (this.collection.total > 0) {
				this.prepareForm(this.collection.total);
			} else {

				// Don't submit the form
				bootbox.alert("<h1>Something's missing.</h1>You haven't made any designations yet.");
				return false;
			}
		}
	});

	var DesignationComponent = Backbone.View.extend({
		tagName: 'fieldset',
		className: 'designation-component',
		$fundList: null,
		template: _.template($('script#tpl-designation-component').html()),
		events: {
			'change select':'updateFund',
			'click .designation-delete':'destroyView',
			'blur .designation-amount':'updateAmount'
		},
		initialize: function() {
			this.listenTo(this.model,'destroy',this.remove);
		},
		updateFund: function() {
			var $op = this.$('.fund option:selected');

			this.model.set({ 'fund': $op.val() });
			this.updateFundInfo($op.data('info'));
		},
		updateFundInfo: function(info) {
			this.$('.fund-info').fadeOut(200,function() {
				$(this).text('Your donation ' + info + '.').fadeIn(350);
			});
		},
		updateAmount: function(e) {
			var amount = parseFloat(e.target.value);

			if ($.isNumeric(amount) && amount > 0) {
				this.model.set({'amount': amount});
			}
		},
		render: function() {
			var renderFunds = function(funds) {
				var fund = this.model.get('fund'),
					info = _.findWhere(funds,{'name':fund}).info;

				this.$el.html(this.template({
					'designation':this.model.toJSON(),
					'funds':funds,
					'info': info
				}));

				this.$('.tooltip').tooltip();
			};

			getFunds(this,renderFunds);
			return this;
		},
		destroyView: function () {
			var designation = this.model;

			this.$el.fadeOut(400, function() {
				designation.destroy();
			});
		}
	});

	var AppRouter = Backbone.Router.extend({
		routes: {
			'':'load'
		},
		load: function() {
			var view,
				list = new DesignationList(),
				challengeCache = function(collection,message) {
					bootbox.dialog(message,
					[
						{
							'label': 'Continue to PayPal',
							'class': 'btn',
							'callback': function() { $('.gift-app-form').trigger('submit'); }
						},
						{
							'label':'Add more',
							'class': 'btn-success'
						}
					]);
				},
				evaluateCache = function(collection) {
					if (collection.length > 0) {
						collection.trigger('fetch');
						var body,template = _.template($('script#tpl-cache-review').html());

						body = template({
							title: 'We found something.',
							msg: 'Looks like you were already working on a gift.',
							prompt: 'What do you want to do?',
							designations: collection.toJSON(),
							total: accounting.formatMoney(collection.total)
						});

						challengeCache(collection,body);
					}
				};

			$('#clear-designations-ok').on('click',function() {
				dispatcher.trigger('designations.clear');
			});

			list.fetch({ success: evaluateCache });
			view = new DesignationApp({'collection':list});
		}
	});

	router = new AppRouter();
	Backbone.history.start();
});