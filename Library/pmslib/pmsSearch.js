// Copyright FORTH-ICS, Emmanouil Dermitzakis

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Make globaly available as well
    define(['jquery'], function(jquery) {
      return (root.pressSearch = factory(jquery));
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node / Browserify
    //isomorphic issue
    var jQuery = (typeof window != 'undefined') ? window.jQuery : undefined;
    if (!jQuery) {
      jQuery = require('jquery');
      if (!jQuery.fn) jQuery.fn = {};
    }
    module.exports = factory(jQuery);
  } else {
    // Browser globals
    root.press = factory(root.jQuery);
  }
}(this, function($) {

  var PRESSSearch = function(element, options, cb) {
    this.currentSearchMode = '';
    this.currentSearchFields = {};

    this.base_url = "../";
    this.dbURL = "";
    this.prefix = "";
    this.current_user = {};
    this.category_tree = {};
    this.category_labels = {};
    this.element = $(element);
    this.fieldElement = $('<div id="form-fields"></div>');
    this.fields = {};
    this.orgs = {};
    this.authorGroups = {};
    this.personFields = personFields;
    this.cat;
    this.subcat;
    this.category_list;
    this.JSONfields = JSONfields;
    this.JSONrequiredFields = JSONrequiredFields;
    this.titleFields = titleFields;
    this.bloodhounds = {};
    this.loader;
    this.filterLoader;
    this.resultContainer = $('<div id="result-container" class="col-sm-9"></div>');
    this.results = $('<div id="results"></div>');
    this.resultContainer.append(this.results);
    this.filters = $('<div id="filters" class="col-sm-3"></div>');
    this.lastQueryWithoutFilters = [];
    this.lastQueryWithFilters = [];
    this.lastSearchLabel = '';
    this.contributorOrder = JSONContributorOrder;
    this.advanced_search = $('<div id="advanced_search" class="collapse col-sm-12"></div>');
    this.categoryColor = categoryColor;
    this.parameters = {};

    this.categoryDescendants = {}; //TODO
    this.categoryAncestors = {};

    function findDescendants(object, descendantObject, depth){
      for (var key in object){
        if (typeof object[key] === 'object' && !($.isArray(object[key]))){
          descendantObject.push(key);
          descendantObject = findDescendants(object[key], descendantObject, depth+1);
        }else if($.isArray(object[key])){
          descendantObject.push(key);

        }
      }
      return descendantObject;
    }


    for (var key in this.JSONfields){
      this.categoryDescendants[key] = [];
      this.categoryDescendants[key] = findDescendants(this.JSONfields[key], this.categoryDescendants[key], 0);
    }



    for (key in this.categoryDescendants){
      for (var i=0; i< this.categoryDescendants[key].length; i++){
        this.categoryAncestors[this.categoryDescendants[key][i]] = key;
      }
    }

    //custom options from user
    if (typeof options !== 'object' || options === null)
      options = {};

    //allow setting options with data attributes
    //data-api options will be overwritten with custom javascript options
    options = $.extend(this.element.data(), options);

    if (typeof options.base_url === 'string')
      this.base_url = options.base_url;

    if (typeof options.dbURL === 'string')
      this.dbURL = options.dbURL;

    if (typeof options.prefix === 'string')
      this.prefix = options.prefix;

    if (typeof options.organizations === 'object')
      this.orgs = options.organizations;

    if (typeof options.authorGroups === 'object')
      this.authorGroups = options.authorGroups;

    if (typeof options.current_user === 'object')
      this.current_user = options.current_user;

    if (typeof options.parameters === 'object')
      this.parameters = options.parameters;

    console.log(this.parameters);
    this.loader = $('<div id="loader">');
    this.filterLoader = $('<div id="filterLoader">');
    element.append(this.loader);
    $.when(this.getCategories(), this.getTags()).always($.proxy(function(a1, a2) {
      if (!(a1) || !a2) {
        console.error('GET was unsuccesfull');
        return;
      }

      this.loader.hide();

      var $free_search = $('<div class="col-sm-12 form-group">'+
        '<div class="col-sm-1"></div>'+
        '<div class="col-sm-10"><input id="free-text" class="form-control input-sm" '+
            'type="text" placeholder="Enter text for free text search"></input></div>'+
        '<a id="searchByFields"  class="glyphicon glyphicon-search" '+
            'style="font-size:30px; text-decoration:none;"></a>&nbsp;'+
      '</div>'+
      '<div class="col-sm-6"><a id="advanced_search_button" data-toggle="collapse"'+
          ' href="#advanced_search">Advanced Search</a></div>'+
      '<div class="col-sm-6"><a id="category_list_button" data-toggle="collapse"'+
          ' href="#Category-List" aria-expanded="true" aria-controls="Category-List"'+
          ' style="visibility:hidden; float:right">Browse By Category</a></div>'+
      '</div>');
      this.element.append($free_search);
      $('#free-text', this.element).on('keypress', (function(e){
        if (e.keyCode == 13)
          this.searchByFields();
      }).bind(this));
      $('#searchByFields', this.element).on('click', (function(){
        this.searchByFields();
      }).bind(this));

      this.advanced_search.append(this.getAuthorField());

      this.advanced_search.append(this.getOrgsField(this.orgs));

      this.advanced_search.append(this.getYearField());
      this.advanced_search.append(this.getTagField(a2[0]));
      var categories = this.getCategoriesFields(this.category_tree);
      this.advanced_search.append(categories[0]);
      this.advanced_search.append(categories[1]);
      this.advanced_search.append(this.getReviewedField());
      this.advanced_search.append($('<button>', {
        text: 'Clear',
        id: 'searchClear',
        type: 'button',
        class: 'btn btn-default btn-sm',
        style: 'position:absolute; right:150px; bottom:8px;',
        click: (function(that) {
              return function(){
                that.clearSearchInput();
                that.clearAdvancedSearch();
              };
            })(this)
        }));

      this.element.append(this.advanced_search);
      // this.insertButtons();
      // this.element.append($('<p>&nbsp;</p>'));
      this.category_list = this.getCategoryList();

      //Create advanced search fields
      this.advanced_search.on('show.bs.collapse', (function(that){
        return function(){
          that.category_list.collapse('hide');
          $('#category_list_button', that.element).css('visibility', 'hidden');
        };
      })(this));
      this.advanced_search.on('hide.bs.collapse', (function(that){
        return function(){
          $('#category_list_button', that.element).css('visibility', '');
          $('#advanced_search_button', that.element).css('visibility', '');
        };
      })(this));
      this.category_list.on('show.bs.collapse', (function(that){
        return function(){
          that.advanced_search.collapse('hide');
          $('#advanced_search_button', that.element).css('visibility', 'hidden');
        };
      })(this));
      this.category_list.on('hide.bs.collapse', (function(that){
        return function(){
          $('#advanced_search_button', that.element).css('visibility', '');
          $('#category_list_button', that.element).css('visibility', '');
        };
      })(this));
      // this.category_list.prepend($('<div class="col-sm-2"></div><h2>Browse By Category</h2>'));
      this.element.append(this.category_list);
      this.element.append('<p>&nbsp;</p>');
      this.element.append(this.resultContainer);
      this.element.append(this.filters);
    }, this));
  };

  PRESSSearch.prototype = {
    constructor: PRESSSearch,

    //Set dbURL
    setdbURL: function(url) {
      this.dbURL = url;
    },
    //Get Categories and populate select fields
    getCategories: function() {
      return $.ajax({

          dataType: 'json',
          method: "GET",
          url: this.dbURL,
          data: {
            query: "prefix press: <" + this.prefix + "> " +
              'SELECT (strafter(str(?low), "#") AS ?lowid) ?lowlabel ?optgroup ?pubCounter' +
              '(strafter(str(?superclass), "#") AS ?superclassid) ?superlabel ' +
              "WHERE { " +
                '{'+
                  'SELECT (COUNT(?pub) as ?pubCounter) ?low '+
                  'WHERE { '+
                      '?low rdfs:subClassOf* press:Publication. '+
                      'OPTIONAL {?pub rdf:type [rdfs:subClassOf* ?low]}. '+
                  '} GROUP BY ?low '+
                '}' +
                'OPTIONAL {?low rdfs:label ?lowlabel}. ' +
                'OPTIONAL {?low press:optgroup ?optgroup}. ' +
                'OPTIONAL {?low rdfs:subClassOf ?superclass} ' +
              '}'
          }
        })
        .done($.proxy(function(response) {
          var category_tree = {};
          var results = response.results.bindings;
          category_labels = {};
          function array_to_tree(array, father) {
            var tree = {};
            for (var i = 0; i < array.length; i++) {
              if ('superclassid' in array[i] && array[i].superclassid.value === father) {
                tree[array[i].lowid.value] = {};

                if ('lowlabel' in array[i]) {
                  category_labels[array[i].lowid.value] = array[i].lowlabel.value;
                  tree[array[i].lowid.value].label = array[i].lowlabel.value;
                }
                if ('optgroup' in array[i]) {
                  tree[array[i].lowid.value].optgroup = array[i].optgroup.value;
                }
                if ('pubCounter' in array[i]) {
                  tree[array[i].lowid.value].pubCounter = array[i].pubCounter.value;
                }
                tree[array[i].lowid.value].children = array_to_tree(array, array[i].lowid.value);
              }
            }
            return tree;
          }
          this.category_labels = category_labels;
          category_tree = array_to_tree(results, 'Publication');
          this.category_tree = category_tree;
          return category_tree;
        }, this))
        .fail(function(response) {
          alert(response);
          console.error(response);
        });
    },
    //Get tags from Database
    getTags: function() {
      tags = [];
      return $.ajax({
          dataType: 'json',
          method: "GET",
          url: this.dbURL,
          data: {
            query: 'prefix press: <' + this.prefix + '> ' +
              'SELECT distinct ?tag WHERE { ' +
              '?pub press:Tag ?tag} '
          }
        })
        .done($.proxy(function(response) {

        }, this))
        .fail(function(response) {
          alert(response);
        });
    },
    //Get Tag Field using typeahead.js and sortable.js
    getTagField: function(response){
      var tags = [];
      for (var i = 0; i < response.results.bindings.length; i++) {
        tags[i] = response.results.bindings[i].tag.value;
      }

      var required = '';
      $input = $('<input class="typeahead form-control input-sm press-field" '+
          'id="tag-input" data-label="Tags" type="text"/>');
      $ul = $('<ul id="tag-editable" class="list-group editable" style="display:none"></ul>');
      var $taggroup = $('<div id="tag-group" class="form-group"></div>');
      var $col_div = $('<div class="col-sm-9"></div>');
      $taggroup.append($('<label class="col-sm-2 control-label" for="tag-input">Tags:</label>'));
      $taggroup.append($col_div);
      $col_div.append($input);
      $col_div.append($ul);

      var tagsBlood = new Bloodhound({
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        local: tags
      });

      $input.typeahead({
        hint:false,
        highlight: true,
        minLength: 0
      }, {
        limit: 100,
        name: 'tags',
        source: tagsBlood
      });

      var sortable = Sortable.create($ul[0], {
        filter: '.js-remove',
        onFilter: function(evt) {
          parent = evt.item.parentNode;
          parent.removeChild(evt.item);

          if (parent.children.length === 0) {
            parent.style.display = "none";
          }
        }
      });

      $input.bind('typeahead:select', function(ev, suggestion) {
        var $list = $('#tag-editable');
        var valid = true;
        $('.tag-item').each(function() {
          if ($(this).attr('id') === suggestion) {
            return valid = false;
          }
        });
        if (valid) {
          var $li;
          $li = $('<li id="'+suggestion+'" class="tag-item list-group-item" draggable="false" style="float:left"></li>');
          $list.append($li);
          $li.html(suggestion);
          $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
          $list.show();
        }
        $(this).typeahead('val', '');
      });
      return $taggroup;
    },
    //Get Author Field using typeahead.js and sortable.js
    getAuthorField: function() {  //Typeahead Field for searching Authors

      var $group = $('<div class="form-group" id="author-bloodhound"></div>');
      var $label = $('<label class="col-sm-2 control-label" for="author-input">Author:</label>');
      var $d = $('<div class="col-sm-9"></div>');
      var tooltip = 'Each word has to be at least 3 characters long to search.';

      var $input = $('<input id="author-input" data-toggle="tooltip" data-placement="top" title="'+tooltip+'" class="typeahead form-control input-sm" type="text"/>');
      $input.mouseover(function(e){$(this).tooltip();});
      $input.mouseover();

      $d.append($input);

      $group.append($label);
      $group.append($d);
      if (Object.keys(this.bloodhounds).length === 0) {
        for (var key in this.authorGroups) {
          var groupKey = key;
          this.bloodhounds[key] = new Bloodhound({
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('givenName familyName'),
            sufficient: 500,
            remote: {
              url: this.dbURL,//+"?query="+query,
              wildcard: '%QUERY',
              prepare: (function(groupKey, prefix){
                    return function(query, settings){

                var queries = query.split(' ');

                BDSquery = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n'+
                          'prefix press: <'+prefix+'> \n' +
                          'SELECT ?uuid (CONCAT(?givenName, \" \", ?familyName) '+
                            'AS ?fullName) ?givenName ?familyName (substr(?mbox, 8) as ?mail) WHERE { \n';
                for(var i=0; i<queries.length; i++){
                  if (queries[i].length < 3) return false;
                  BDSquery += '?o'+i+' bds:search "'+queries[i]+'*". \n'+
                    '?uuid ?p'+i+' ?o'+i+' . \n'+
                    'filter(?p'+ i +' = foaf:familyName || ?p'+i+' = foaf:givenName). \n';
                }

                BDSquery += '?uuid foaf:familyName ?familyName. \n'+
                '?uuid foaf:givenName ?givenName. \n'+
                'optional{?uuid foaf:mbox ?mbox}. \n'+
                '?uuid press:Person_Group "'+groupKey+'". }';

                settings.data = {
                  query : BDSquery,
                };
                return settings;
              };})(key, this.prefix),
              transform: (function (groupKey){
                return function(response){
                  if (typeof response !== 'object') return [];
                  var tr=[];
                  var results = response.results.bindings;
                  for(var i=0; i<results.length; i++){
                    tr[i] = {
                      uuid: results[i].uuid.value,
                      fullName: results[i].fullName.value,
                      tokens: [results[i].familyName.value, results[i].givenName.value],
                      group: groupKey
                    };
                    if ('mail' in results[i]){
                      tr[i].mail = results[i].mail.value;
                    }
                  }
                  return tr;
                };
              })(key),
              // cache: false    //NOTE Sure about this?
            }
          });
        }
      }
      var datasets = [];
      var j=0;
      for (var key in this.authorGroups) {

        datasets[j++] = {
          source: this.bloodhounds[key],
          name: key,
          display: 'fullName',
          templates: {
            header: '<h4 class="author-category">' + this.authorGroups[key].label + '</h4>',
            suggestion: function(data) {
              var mail = '';
              if ('mail' in data){
                mail = ' - ' + data.mail;
              }
              // return '<p><strong>' + data.fullName + '</strong></p>';
              return '<p><strong>' + data.fullName + '</strong>' + mail + '</p>';
            }
          },
          limit: 10

        };
      }
      var autocomplete = $input.typeahead({
        hint: false,
        highlight: false,
        minLength: 3
      }, datasets);

      var $ul = $('<ul id="author-editable" class="list-group editable" style="display:none"></ul>');
      $d.append($ul);

      var sortable = Sortable.create($ul[0], {
        filter: '.js-remove',
        group: 'contributors',
        onFilter: function(evt) {
          parent = evt.item.parentNode;
          parent.removeChild(evt.item);

          if (parent.children.length === 0) {
            parent.style.display = "none";
          }
        },
        onRemove: function(evt) {
          parent = evt.item.parentNode;
          if (parent.children.length === 0) {
            parent.style.display = "none";
          }
        }
      });

      $input.bind('typeahead:select keypress', (function(that){
          return function(ev, suggestion) {
          if (ev.type === 'keypress' && ev.which != 13) {
            return;
          }

          var valid = true;
          $(ev.type !== 'keypress' && '.author-contributor-name').each(function() {
            if ($(this).attr('data-uuid') === suggestion.uuid) {
              valid = false;
              return false;
            }
          });
          if (valid) {
            var $list = $('#author-editable');
            var $li;
            if (ev.type === 'typeahead:select') {
              var mail = '';
              if ('mail' in suggestion){
                mail = 'title="'+suggestion.mail+'"';
              }
              // $li = $('<li class="list-group-item" title="' + suggestion.mail + '" draggable="false" style="float:left"></li>');
              $li = $('<li class="list-group-item" '+mail+' draggable="false" style="float:left"></li>');
            }
            $list.append($li);


            if (ev.type === 'keypress') {
              // $exAuthorsModal.modal();
            } else {
              var author_group = "";

              for (key in that.authorGroups){
                if (suggestion.group === key && ('span' in that.authorGroups[key])){
                  author_group = that.authorGroups[key].span;
                }
              }

              var mail = '';
              if ('mail' in suggestion){
                mail = 'data-mail="'+suggestion.mail+'"';
              }
              $li.html(author_group + '<span class="author-contributor-name'+
                ' contributor" data-uuid="'+suggestion.uuid+'" data-field="author" '+
                mail + '>' + suggestion.fullName + '</span>');

              $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
              $list.show();
            }
          }
          $(this).typeahead('val', '');
        };
      })(this));

      return $group;
    },
    //Get Tag Field
    getYearField: function(){
      return $('<div class="form-group"><div>'+
      '<label class="col-sm-2 control-label" for="author">Year From:</label>'+
      '<div class="col-sm-4"><input class="form-control input-sm" id="year-from" type="number"></input></div></div>'+
      '<div><label class="col-sm-1 control-label" for="author" style="width:8.33333333%">Year To:</label>'+
      '<div class="col-sm-4"><input class="form-control input-sm" id="year-to" type="number"></input></div></div><div class="col-sm-1"></div>'+
      '</div>');
    },
    //Get typeahead.js field for Organizations
    getOrgsField: function(organization) {
      $input = $('<input class="typeahead form-control input-sm" id="org-input" type="text"/>');
      $ul = $('<ul id="org-editable" class="list-group editable" style="display:none"></ul>');
      var $orggroup = $('<div id="org-group" class="form-group"></div>');
      var $col_div = $('<div class="col-sm-9"></div>');
      $orggroup.append($('<label class="col-sm-2 control-label" for="org-input">'+organization.label+':</label>'));
      $orggroup.append($col_div);
      $col_div.append($input);
      $col_div.append($ul);
      var label = organization.label;
      var org = organization.org;

      var orgValues = [];
      for (var key in org){
        orgValues.push(org[key]);
      }
      var orgsBlood = new Bloodhound({
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        local: orgValues
      });

      function orgWithDefaults(q, sync) {
        if (q === '') {
          sync(orgsBlood.index.all());
          // console.log(orgsBlood.index.all());
        } else {
          orgsBlood.search(q, sync);
        }
      }

      $input.typeahead({
        highlight: true,
        hint: false,
        minLength: 0
      }, {
        limit: 100,
        name: 'org',
        source: orgWithDefaults
      });

      var sortable = Sortable.create($ul[0], {
        filter: '.js-remove',
        draggable: '.extra-org-item',
        onFilter: function(evt) {
          parent = evt.item.parentNode;
          parent.removeChild(evt.item);

          if (parent.children.length === 0) {
            parent.style.display = "none";
          }
        }
      });

      $input.bind('typeahead:select', function(ev, suggestion) {
        var $list = $('#org-editable');
        var valid = true;
        $('.org-item').each(function() {
          if ($(this).attr('id') === suggestion) {
            valid = false;
            return false;
          }
        });
        if (valid) {
          var $li = $('<li id="'+suggestion+'" class="extra-org-item org-item list-group-item" draggable="false" style="float:left"></li>');
          $list.append($li);
          $li.html(suggestion);
          $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
          $list.show();
        }
        $(this).blur();
        setTimeout(function() {
          $('#org-input').typeahead('val', '');
        }, 10);
      });
      return $orggroup;
    },
    //Get Categories field and create <select>
    getCategoriesFields: function(category_tree) {
      this.cat = $('<select class="form-control input-sm" id="category"></select>');
      this.subcat = $('<select class="form-control input-sm" id="subcategory" disabled></select>');

      $catgroup = $('<div id="category-group" class="form-group"></div>');
      $col_div = $('<div class="col-sm-9"></div>');
      $catgroup.append($('<label class="col-sm-2 control-label" for="category">Category:</label>'));
      $catgroup.append($col_div);
      $col_div.append(this.cat);

      $subcatgroup = $('<div id="subcategory-group" class="form-group"></div>');
      $sub_col_div = $('<div class="col-sm-9"></div>');
      $subcatgroup.append($('<label class="col-sm-2 control-label" for="subcategory">Subcategory:</label>'));
      $subcatgroup.append($sub_col_div);
      $sub_col_div.append(this.subcat);

      this.cat.append($('<option value="">Select Category</option>'));
      this.subcat.append($('<option value="">Select Subcategory</option>'));
      for (var key in category_tree) {
        this.cat.append($('<option value="' + key + '">' + category_tree[key].label + '</option>'));
      }

      this.cat.change((function(subcat) { //TODO: Keep Old Fields
        subcat.empty();
        $('#form-fields').empty();
        if ($(this).val() === '') {
          subcat.append($('<option value="">Select Subcategory</option>'));
          subcat.prop('disabled', 'disabled');
          return;
        }
        subcat.append($('<option value="">Select Subcategory</option>'));
        for (var key in category_tree[$(this).val()].children) {
          if (category_tree[$(this).val()].children[key].optgroup) {
            var $opt = $('<optgroup id="' + key + '" label="' + category_tree[$(this).val()].children[key].label + '"></optgroup>');
            subcat.append($opt);
            for (var key2 in category_tree[$(this).val()].children[key].children) {
              $opt.append($('<option value="' + key2 + '">' +
                category_tree[$(this).val()].children[key].children[key2].label + '</option>'));
            }
          } else {
            subcat.append($('<option value="' + key + '">' +
              category_tree[$(this).val()].children[key].label + '</option>'));
          }
        }
        subcat.prop('disabled', false);
      }).bind(this.cat, this.subcat));

      return [$catgroup, $subcatgroup];
    },
    //Get reviewed option field
    getReviewedField: function(){
      var $div = $('<div class="form-group"></div>');
      $div.append('<label for="reviewed" class="col-sm-2 '+
        'control-label">Peer Reviewed Only:</label><div class="col-sm-6">'+
        '<input class="checkbox" id="reviewed" type="checkbox" value="" style="width:18px; height: 18px;"></div>');

      return $div;
    },
    //Get Browse By Category List
    getCategoryList: function(){
      var container = $('<div class="col-md-1"></div>');

      var $listRoot = $('<div class="col-xs-12 col-sm-8 col-md-6" data-key="Publication"></div>');
      $listRoot.append($('<h2>Browse By Category</h2>'));
      function traverse_tree(tree, parent, depth){
        for (var key in tree){
          if('children' in tree[key] && Object.keys(tree[key].children).length !== 0){
            var badge = '<div class="col-xs-2 col-md-1"><h2 style="float:right">'+tree[key].pubCounter+'</h2></div>';
            var $container = $('<div class="list-container col-xs-10 col-md-11" style="padding-top:30px; padding-right:0;"></div>');
            var $next = $('<div class="collapse" id="'+key+'-collapse" data-key="'+key+'"></div>');

            var colorCircle = '';
            if (key in this.categoryColor)
              colorCircle = '<span style="color:'+this.categoryColor[key]+'; font-size:135%;">&#9679;&nbsp;</span>';

            var $category = $('<a id="'+key+'" data-parent="'+parent.attr('data-key')+'"'+
              ' class="search-category" style="cursor:pointer;">'+tree[key].label+'</a>');

            $container.append($(colorCircle));
            $container.append($category);
            $container.append($('<a href="#'+key+'-collapse" style="position:absolute; '+
                'right:0; top:20px; z-index:100" data-toggle="collapse" '+
                'class="btn btn-default glyphicon glyphicon-chevron-right"></a>'));
            $container.append($next);
            var $div = $('<div class="col-xs-12" style="padding-right:0"></div>');
            $div.append(badge);
            $div.append($container);

            parent.append($div);
            traverse_tree(tree[key].children, $next, depth+1);
          }else{
            var category = '<a id="'+key+'" data-parent="'+parent.attr('data-key')+'" class="search-category" style="cursor:pointer;">'+tree[key].label+'</a>';
            var badge = '<div class="col-xs-2 col-md-1"><h2 style="float:right">'+tree[key].pubCounter+'</h2></div>';
            var $div = $('<div class="col-xs-12"></div>');
            $div.append($(badge+'<div class="col-xs-10 col-md-11" style="padding-top:30px">'+category+'</div>'));
            parent.append($div);

          }
        }
      }

      traverse_tree(this.category_tree, $listRoot, 0);
      var $div = $('<div id="Category-List" class="collapse in"></div>');
      $div.append(container);
      $div.append($listRoot);

      $listRoot.find('a.glyphicon').on('click', function(){
        $(this)
          .toggleClass('glyphicon-chevron-right')
          .toggleClass('glyphicon-chevron-down');
      });

      $listRoot.find('a.search-category').on('click', (function(that){
        return function (){
          // that.category_list.hide();
          that.clearSearchInput();
          that.clearAdvancedSearch();
          that.searchByCategory($(this).attr('id'));
        };
      })(this));

      return $div;
    },
    //Get authors from author uuids
    getPredefinedAuthors: function(authoruuids){
      var query = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n';
      query += 'prefix press: <'+prefix+'> \n';
      query += 'SELECT ?uuid (CONCAT(?givenName, \" \", ?familyName) ';
      query += 'AS ?fullName) ?givenName ?familyName (substr(?mbox, 8) as ?mail) ?group WHERE { \n';
      query += '?uuid rdf:type foaf:Person. \n';
      query += 'FILTER('
      for (var i=0; i<authoruuids.length; i++){
        if (i>0) query += ' || ';
        query += '?uuid = <'+authoruuids[i]+'>';
      }
      query += '). \n';
      query += '?uuid foaf:familyName ?familyName. \n';
      query += 'optional{?uuid foaf:givenName ?givenName.} \n';
      query += 'optional{?uuid foaf:mbox ?mbox}. \n';
      query += '?uuid press:Person_Group ?group. }';
      return this.getQuery(query);
    },
    //Back Button utility, return to state
    fillFieldsByStateAndSearch: function(fields, filters, pushState){
      this.clearSearchInput();
      this.clearAdvancedSearch();
      if (typeof fields !== 'object'){
        return;
      }

      $('#free-text', this.element).val(fields.field);
      $('#year-from', this.element).val(fields.yearFrom);

      $('#year-to', this.element).val(fields.yearTo);

      $('#category', this.element).val(fields.category);
      $('#subcategory', this.element).val(fields.subcategory);
      $('#reviewed', this.element).prop('checked', fields.reviewed);

      if (fields.orgs && $.isArray(fields.orgs) && fields.orgs.length>0){
        for(var i=0; i<fields.orgs.length; i++){
          $('#org-editable', this.element).append($('<li id="'+fields.orgs[i]+'"'+
            ' class="extra-org-item org-item list-group-item" draggable="false" '+
            'style="float: left;">'+fields.orgs[i]+'<i class="js-remove">&nbsp;✖</i></li>'));
        }
        $('#org-editable').show();
      }

      if (fields.tags && $.isArray(fields.tags) && fields.tags.length>0){
        for(var i=0; i<fields.tags.length; i++){
          console.log(fields.tags[i]);
          $('#tag-editable', this.element).append($('<li id="'+fields.tags[i]+'"'+
            ' class="tag-item list-group-item" draggable="false" '+
            'style="float: left;">'+fields.tags[i]+'<i class="js-remove">&nbsp;✖</i></li>'));
        }
        $('#tag-editable').show();
      }

      if (fields.authors && $.isArray(fields.authors) && fields.authors.length>0){
        $('#author-editable').show();
        console.log(fields.authors);
        $.when(this.getPredefinedAuthors(fields.authors)).always($.proxy(function(response){
          results = response.results.bindings;
          for(var i=0; i<results.length; i++){
            var $li = $('<li class="list-group-item" draggable="false"'+
              'style="float:left;"></li>');
            var group = (this.authorGroups[results[i].group.value].span) ? this.authorGroups[results[i].group.value].span : '';
            $li.append(group);
            var $span = $('<span class="author-contributor-name contributor" '+
              'data-uuid="'+results[i].uuid.value+'" data-field="author">'+results[i].fullName.value+'</span>');
            if (results[i].mail){
              $li.attr('title', results[i].mail.value);
              $span.attr('data-mail', results[i].mail.value);
            }
            $li.append($span);
            $li.append($('<i class="js-remove">&nbsp;✖</i>'));
            $('#author-editable').append($li);
          }
          this.searchByFields(fields.offset, filters, pushState, fields);
        },this));
      }else{
        $('#author-editable').hide();
        this.searchByFields(fields.offset, filters, pushState, fields);
      }
    },
    //Search By free-text and advanced search utility
    searchByFields: function(offset, filters, pushState, stateObj){
      this.currentSearchMode = 'fields';

      if (typeof pushState === 'undefined'){
        pushState = false;
      }

      this.resultContainer.find('*').not('#results').empty();

      var searchLabel = '';
      this.category_list.collapse("hide");
      this.advanced_search.collapse('hide');
      this.loader.show();
      var prefixes = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n'+   //Constructing Query
                  'prefix press: <'+this.prefix+'> \n';
      var select = 'SELECT DISTINCT ?pub ?score ?scoreOrder ?year '+
          '?English_Title ?order ?type ?External_Link ?Book_Title ?Chapter_Title '+
          '?typeID ?Publication_URL ?Local_Link WHERE{ \n';

      var field = $('#free-text', this.element).val();
      var yearFrom = $('#year-from', this.element).val();

      var yearTo = $('#year-to', this.element).val();

      var category = $('#category', this.element).val();
      var subcategory = $('#subcategory', this.element).val();
      var reviewed = $('#reviewed', this.element).is(':checked');

      if (typeof offset === 'undefined'){
        offset = 0;
      }

      if (typeof filters === 'undefined'){
        filters = this.getFiltersValues(this.filters);
      }

      if (field !== '')
        searchLabel += '"'+field+'"';

      var authorQuery = '';
      var authors = $('.author-contributor-name');
      var authorIds = [];
      if (authors.length === 0){

      }else{
        if (searchLabel !== '')
          searchLabel += ', ';

        if (authors.length === 1){
          searchLabel += 'Author: ';
        }else{
          searchLabel += 'Authors: ';
        }
        authorQuery += '?con rdfs:subPropertyOf* press:contributor. \n';
        for (var i=0; i<authors.length; i++){
          authorQuery += '?slot'+i+' press:list_item <'+$(authors[i]).attr('data-uuid')+'>. \n';
          authorQuery += '?list'+i+' press:slot ?slot'+i+'. \n';
          authorQuery += '?pub ?con ?list'+i+'. \n';

          authorIds.push($(authors[i]).attr('data-uuid'));
          searchLabel += $(authors[i]).text();
          if (i<authors.length-1)
            searchLabel +=  ', ';
        }
      }

      var orgs = [];        //Get orgs
      var orgIds = [];
      orgs = $('#org-editable li');
      var orgQuery = '';
      if (orgs.length === 0){

      }else if(orgs.length === 1){
        if (searchLabel !== '')
          searchLabel += ', ';

        orgQuery = '?pub press:belongsTo press:'+orgs.attr('id')+'. \n';
        searchLabel += 'Organization: ' + orgs.contents().not(orgs.children()).text() + ', ';
        orgIds.push(orgs.attr('id'));
      }else{
        if (searchLabel !== '')
          searchLabel += ', ';

        searchLabel += 'Organizations: ' + $(orgs[0]).contents().not($(orgs[0]).children()).text();
        orgQuery = '?pub press:belongsTo ?org. \n'+
                   'FILTER(?org = press:'+$(orgs[0]).attr('id');
        orgIds.push($(orgs[0]).attr('id'));
        for (var i=1; i<orgs.length; i++){
          orgQuery+= ' || ?org = press:'+$(orgs[i]).attr('id');
          var text = $(orgs[i]).contents().not($(orgs[i]).children()).text();
          searchLabel += text;
          orgIds.push($(orgs[i]).attr('id'));
          if (i<orgs.length-1)
            searchLabel += ', ';
        }
        orgQuery += '). \n';
      }

      var tagQuery = '';
      var tags = $('.tag-item');
      var tagIds = [];
      if (tags.length > 0){
        if (searchLabel !== ''){
          searchLabel += ', ';
        }

        if (tags.length === 1){
          searchLabel += 'Tag: ';
        }else{
          searchLabel += 'Tags: ';
        }

        for (var i=0; i<tags.length; i++){
          tagQuery += '?pub press:Tag "'+$(tags[i]).attr('id')+'". \n';
          tagIds.push($(tags[i]).attr('id'));
          searchLabel += $(tags[i]).attr('id');
          if (i<tags.length-1)
            searchLabel +=  ', ';
        }

      }
      //Create new state for history
      if (!pushState){
        stateObj = {
          field: field,
          yearFrom: yearFrom,
          yearTo: yearTo,
          category: category,
          subcategory: subcategory,
          reviewed: reviewed,
          authors: authorIds,
          orgs: orgIds,
          tags: tagIds,
          offset: offset,
          filters: filters
        };
        var search = '?';
        for (var key in stateObj){
          if (key !== 'filters'){
            if (typeof stateObj[key] === 'string' && stateObj[key] !== ''){
              search += key + '=' + encodeURIComponent(stateObj[key]) + '&';
            }else{
              for (var j=0; j<stateObj[key].length; j++){
                if (stateObj[key][j] !== '')
                  search += key + j +'=' + encodeURIComponent(stateObj[key][j]) + '&';
              }
            }
          }else{
            for (var filterKey in stateObj.filters){
              var index = 0;
              for (var filterVal in stateObj.filters[filterKey]){
                if (typeof stateObj.filters[filterKey][filterVal] === 'object'){

                  search+= filterKey + index++ + '=' + encodeURIComponent(filterVal)+'&';
                }
              }
            }
          }
        }
        search = search.substring(0, search.length - 1);
        window.history.pushState(stateObj, "", window.location.origin + window.location.pathname + search);
      }

      window.onpopstate = (function(that){
        return function(event){
          if (!event.state){
            location.reload();
          }else{
            var currentState = event.state;
            that.fillFieldsByStateAndSearch(currentState, currentState.filters, true);
          }
        };
      })(this);

      var yearQuery = '';
      if (yearFrom !== '' || yearTo !== ''){
        if (searchLabel !== '')
          searchLabel += ', ';

        searchLabel += 'Year: ';
        yearQuery = '?pub press:Year ?year. \n';
        yearQuery += 'FILTER (';
        var yearAnd = '';
        var sameYear = false;
        var yearRange = '';
        var toRange = '';
        var fromRange = '';
        if(yearFrom !== '' && yearTo !== ''){
          yearAnd = ' && ';
          yearRange = ' - ';
          if (yearFrom === yearTo){
            searchLabel += yearFrom;
            sameYear = true;
          }
        }else{
          if (yearFrom !== ''){
            fromRange = ' &gt; ';
          }
          if (yearTo !== ''){
            toRange = ' &lt; ';
          }
        }
        if (yearFrom !== ''){
          yearQuery += '?year >= str('+yearFrom+')';
          if (!sameYear){
            searchLabel += fromRange + yearFrom;
          }
        }

        if (yearTo !== ''){
          yearQuery += yearAnd + '?year <= str('+ yearTo +')';
          if (!sameYear){
            searchLabel += toRange + yearRange + yearTo;
          }
        }
        yearQuery += '). \n';
      }

      var catQuery = '';

      var reviewedQuery = '';
      if (category === '' && reviewed){
        if (searchLabel !== '')
          searchLabel += ', ';

        reviewedQuery = '?pub rdf:type ?type. \n';
        reviewedQuery += '?type rdfs:subClassOf* ?ancClass. \n';
        reviewedQuery += 'FILTER (?ancClass = press:Journal_Peer_reviewed || ?ancClass = press:Conf_Peer_reviewed). \n';
        searchLabel += ' Peer Reviewed Only';
      } else if (category !== ''){
        if (searchLabel !== '')
          searchLabel += ', ';
        if (!reviewed){
          if(subcategory !== ''){
            reviewedQuery += '?pub rdf:type ?type. \n';
            reviewedQuery += '?type rdfs:subClassOf* press:'+subcategory+'. \n';
            searchLabel += this.category_labels[subcategory];
          }else{
            reviewedQuery += '?pub rdf:type ?type. \n';
            reviewedQuery += '?type rdfs:subClassOf* press:'+category+'. \n';
            searchLabel += this.category_labels[category];
          }
        }else {
          if(subcategory !== ''){
            reviewedQuery += '?pub rdf:type ?type. \n';
            reviewedQuery += '?type rdfs:subClassOf* press:'+subcategory+'. \n';
            searchLabel += this.category_labels[subcategory] + ', Peer Reviewed Only';
          }else{
            reviewedQuery += '?pub rdf:type ?type. \n';
            reviewedQuery += '?type rdfs:subClassOf* press:'+category+'. \n';
            reviewedQuery += '?type rdfs:subClassOf* ?ancClass. \n';
            reviewedQuery += 'FILTER (?ancClass = press:Journal_Peer_reviewed || ?ancClass = press:Conf_Peer_reviewed). \n';
            searchLabel += this.category_labels[category] + ', Peer Reviewed Only';
          }
        }
      }

      var fieldQuery = '';

      if (field !== ''){
        fieldQuery += '?searchField bds:search "'+field+'". \n';
        fieldQuery += '?searchField bds:matchAllTerms "true". \n';
        fieldQuery += '?searchField bds:relevance ?score. \n';
        fieldQuery += '?pub ?predicate ?searchField. \n';
        fieldQuery += '?pub rdf:type [rdfs:subClassOf* press:Publication]. \n';
        fieldQuery += 'BIND(concat(str(?score), str(?pub)) as ?scoreOrder). \n';
        fieldQuery += 'MINUS {?pub press:English_Abstract ?searchField}. \n';
        fieldQuery += 'MINUS {?pub press:Publication_URL ?searchField}. \n';
      }
      var restFields = '';
      if (reviewedQuery === ''){
        restFields += '?pub rdf:type ?type. \n';
      }
      if (yearQuery === ''){
        restFields += '?pub press:Year ?year. \n';
      }
      if (fieldQuery === 0){
        restFields += 'BIND(concat(str(?year), str(?pub)) as ?order). \n';
      }
      restFields += 'BIND(strafter(str(?type), "#") AS ?typeID). \n'+
                  'OPTIONAL{?pub press:External_Link ?External_Link}. \n'+
                  'OPTIONAL{?pub press:Book_Title ?Book_Title}. \n'+
                  'OPTIONAL{?pub press:Chapter_Title ?Chapter_Title}. \n'+
                  'OPTIONAL{?pub press:English_Title ?English_Title}. \n'+
                  'OPTIONAL{?pub press:Local_Link ?Local_Link}. \n'+
                  'OPTIONAL{?pub press:Publication_URL ?Publication_URL}. \n';

      var closure = '';
      if (fieldQuery !== '') {
        closure += '}order by desc(?scoreOrder)';
      }else{
        closure += '}order by desc(?order)';
      }
      query = fieldQuery + authorQuery + orgQuery + yearQuery + reviewedQuery + tagQuery;

      for (key in filters){
        if (key !== 'contributors'){
          for (var filterVal in filters[key]){
            query += filters[key][filterVal];
          }
        }else{
          if (filters.contributors.intro)
            query += filters.contributors.intro;
          for (var filterVal in filters[key]){
            if (typeof filters[key][filterVal] === 'object'){
              query += filters[key][filterVal];
            }
          }
        }
      }

      var completeQuery = prefixes + select + query + restFields + closure;

      // console.log (query);
      // console.log(yearQuery);
      //
      // console.log(orgQuery);
      //
      // console.log(field);
      // console.log(yearFrom);
      // console.log(yearTo);
      // console.log(category);
      // console.log(subcategory);
      // console.log(reviewed);
      this.lastSearchLabel = searchLabel;

      $.when(this.getQuery(completeQuery, 10, offset),
              this.getCount(prefixes, query)).done((function(a1, a2) {
        var response = a1[0].results.bindings;
        var pubs = [];
        for (var i=0; i<response.length; i++){
          pubs[i] = response[i].pub.value;
        }

        var count = 0;
        if(a2[0].results.bindings.length === 1 && 'count' in a2[0].results.bindings[0]){
          var count = parseInt(a2[0].results.bindings[0].count.value);
        }
        if (count > 0){
          $.when(this.getPublicationsContributors(pubs, this.personFields), this.getPublicationsMultipleFields(pubs)).done((function (a3, a4){
            this.insertSearchResults(a1[0], a3[0], a4[0], this.personFields, searchLabel, 0, count);
            this.resultContainer.append(this.getPagination(completeQuery, count, offset, this.personFields, searchLabel, stateObj));
          }).bind(this));
        }else{
          this.insertSearchResults(null, null, null, this.personFields, searchLabel, 0, 0);
        }
      }).bind(this));

      $.when(this.getFilters(prefixes, query),
              this.getAuthorFilters(prefixes, query)).done((function(a1, a2){
        this.insertFilters(a1[0], a2[0], filters);
      }).bind(this));
    },
    //Browse by category functionality
    searchByCategory: function(category_id, offset, filterValues, pushState){
      this.currentSearchMode = 'category';


      if (typeof category_id === 'undefined'){
        category_id = window.history.state.category;
      }

      if (typeof offset === 'undefined'){
        offset = 0;
      }

      if (typeof pushState === 'undefined'){
        pushState = false;
      }

      var selectedFilters;

      if (typeof filterValues === 'undefined'){
        selectedFilters = $('.search-filter[data-selected="selected"]', this.filters);
        filterValues = this.getFiltersValues(this.filters);
      }
      this.resultContainer.find('*').not('#results').empty();
      var $element = $('#'+category_id, this.element);

      //Set state for history
      if (!pushState){
        stateObj = {category: category_id, offset: offset, filters: filterValues};
        var search = '?';
        for (var key in stateObj){
          if (key !== 'filters'){
            search += key + '=' + encodeURIComponent(stateObj[key]) + '&';
          }else{
            for (var filterKey in stateObj.filters){

              for (var filterVal in stateObj.filters[filterKey]){
                if (typeof stateObj.filters[filterKey][filterVal] === 'object'){
                  search+= filterKey + '=' + encodeURIComponent(filterVal)+'&';
                }
              }
            }
          }
        }
        search = search.substring(0, search.length - 1);
        window.history.pushState(stateObj, "", window.location.origin + window.location.pathname + search);
      }



      window.onpopstate = (function(that){
        return function(event){
          if (!event.state){
            location.reload();
          }else{
            var currentState = event.state;
            that.searchByCategory(currentState.category, currentState.offset, currentState.filters, true);
          }
        };
      })(this);
      this.category_list.collapse("hide");
      var $temp = $element;
      var catpath = [$element.attr('id')];

      while ($temp.attr('data-parent') !== 'Publication'){    //Find Category Ancestors
        catpath.unshift($temp.attr('data-parent'));
        $temp = $('#'+$temp.attr('data-parent'));
      }
      var i =0;
      var fields = [];
      var fieldObject = this.JSONfields;
      var requiredFields = [];
      var requiredObject = this.JSONrequiredFields;
      while(i < catpath.length){
        fieldObject = fieldObject[catpath[i]];
        requiredObject = requiredObject[catpath[i]];
        i++;
      }

      //Get same required  fields for all categories & subcategories
      var allRequired = {};
      function getRequired(obj, array){
        if ($.isArray(obj)){
          for(var i=0; i<obj.length; i++){
            if(!(obj[i] in array)){
              array[obj[i]] = 0;
            }
            array[obj[i]] ++;
          }
        }else{
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              array = getRequired(obj[key], array);
            }
          }
        }
        return array;
      }
      allRequired = getRequired(requiredObject, allRequired);

      var prefixes = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n'+   //Constructing Query
                  'prefix press: <'+this.prefix+'> \n';
      var select = 'SELECT * WHERE { \n';
      var selectorQuery = '?pub rdf:type [rdfs:subClassOf* press:'+$element.attr('id')+']. \n';
      selectorQuery += '?pub rdf:type ?type. \n'+
                       'BIND(strafter(str(?type), "#") AS ?typeID). \n';
      for (key in filterValues){
        if (key !== 'contributors'){
          for (var filterVal in filterValues[key]){
            selectorQuery += filterValues[key][filterVal];
          }
        }else{
          if (filterValues.contributors.intro)
            selectorQuery += filterValues.contributors.intro;
          for (var filterVal in filterValues[key]){
            if (typeof filterValues[key][filterVal] === 'object'){
              selectorQuery += filterValues[key][filterVal];
            }
          }
        }
      }
      var fieldQuery = '?pub press:Year ?year. \n'+
                       'BIND(concat(str(?year), str(?pub)) as ?order). \n'+
                      //  '?pub press:belongsTo ?org. \n'+
                      //  '?org press:Organization_Name ?orgName. \n'+
                       'OPTIONAL{?pub press:External_Link ?External_Link}. \n'+
                       'OPTIONAL{?pub press:Book_Title ?Book_Title}. \n'+
                       'OPTIONAL{?pub press:Chapter_Title ?Chapter_Title}. \n'+
                       'OPTIONAL{?pub press:English_Title ?English_Title}. \n'+
                       'OPTIONAL{?pub press:Local_Link ?Local_Link}. \n'+
                       'OPTIONAL{?pub press:Publication_URL ?Publication_URL}. \n';

      var authorQuery = 'OPTIONAL{ \n';
      i=0;
      for (var key in this.personFields) {
       if (this.personFields.hasOwnProperty(key)) {
         if (key in allRequired){
           if (i++ !==0) authorQuery+= 'UNION ';
           authorQuery += '{ SELECT ?pub ?'+key+'index ?'+key+'givenName ?'+key+'familyName WHERE { \n';
           authorQuery += '?pub press:'+ key + ' ?' + key +'s. \n';
           authorQuery += '?'+key+'s press:slot ?'+key+'slot. \n';
           authorQuery += '?'+key+'slot press:list_item ?'+key+'uuid. \n';
           authorQuery += '?'+key+'slot press:list_index ?'+key+'index. \n';
           authorQuery += '?'+key+'uuid foaf:givenName ?'+key+'givenName. \n';
           authorQuery += '?'+key+'uuid foaf:familyName ?'+key+'familyName. }} \n';
         }
       }
      }
      authorQuery += '}\n';
      var closure = '} order by desc(?order)';

      var query = selectorQuery + fieldQuery;
      var completeQuery = prefixes + select + query + closure;

      this.loader.show();
      this.lastSearchLabel = 'for '+this.category_labels[$element.attr('id')]+' Category';

      $.when(this.getQuery(completeQuery, 10, offset),
              this.getCount(prefixes, query)).done((function(a1, a2) {
        var response = a1[0].results.bindings;
        var pubs = [];
        for (var i=0; i<response.length; i++){
          pubs[i] = response[i].pub.value;
        }
        var count = 0;
        if(a2[0].results.bindings.length === 1 && 'count' in a2[0].results.bindings[0]){
          var count = parseInt(a2[0].results.bindings[0].count.value);
        }
        if (count > 0){
          $.when(this.getPublicationsContributors(pubs, allRequired), this.getPublicationsMultipleFields(pubs)).done((function (a3, a4){
            this.insertSearchResults(a1[0], a3[0], a4[0], allRequired, 'for '+this.category_labels[$element.attr('id')]+' Category', offset, count);
            this.resultContainer.append(this.getPagination(completeQuery, count, offset, allRequired, 'for '+this.category_labels[$element.attr('id')]+' Category', stateObj));
          }).bind(this));
        }else{
          this.insertSearchResults(null, null, null, this.personFields, 'for '+this.category_labels[$element.attr('id')]+' Category', 0, 0);
        }
      }).bind(this));

      $.when(this.getFilters(prefixes, selectorQuery),
              this.getAuthorFilters(prefixes, selectorQuery)).done((function(a1, a2){
        this.insertFilters(a1[0], a2[0], filterValues);
      }).bind(this));
    },
    //Pagination functionality using twbsPagination.js
    getPagination: function(query, count, offset, requiredFields, searchLabel, stateObj){
      var $pagination = $('<ul class="pagination"></ul>');
      var pages = Math.ceil(count/10);
      var firstPageClick = true;


      $pagination.twbsPagination({
        totalPages: pages,
        startPage: Math.ceil(offset/10)+1,
        visiblePages:7,
        onPageClick: (function(that){
          return function(event, page){
            if (firstPageClick){
              firstPageClick = false;
              return;
            }
            that.results.empty();
            $('html,body').animate({scrollTop: 0}, 'fast');
            that.loader.show();
            $.when(that.getQuery(query, 10, (page-1)*10)).done((function(a1) {
              var response = a1.results.bindings;
              var pubs = [];
              for (var i=0; i<response.length; i++){
                pubs[i] = response[i].pub.value;
              }
              if(count>0){
                $.when(that.getPublicationsContributors(pubs, requiredFields), that.getPublicationsMultipleFields(pubs)).done((function(a2, a3){
                  this.insertSearchResults(a1, a2[0], a3[0], requiredFields, searchLabel, (page-1)*10, count);
                }).bind(this));
              }else{
                this.insertSearchResults(null, null, null, requiredFields, searchLabel, 0, 0);
              }
              stateObj.offset = (page-1)*10;
              var search = '?';
              for (var key in stateObj){
                if (key !== 'filters'){
                  search += key + '=' + encodeURIComponent(stateObj[key]) + '&';
                }else{
                  for (var filterKey in stateObj.filters){

                    for (var filterVal in stateObj.filters[filterKey]){
                      if (typeof stateObj.filters[filterKey][filterVal] === 'object'){
                        search+= filterKey + '=' + encodeURIComponent(filterVal)+'&';
                      }
                    }
                  }
                }
              }
              search = search.substring(0, search.length - 1);
              window.history.pushState(stateObj, "", window.location.origin + window.location.pathname + search);
            }).bind(that));
          };
        })(this)
      });
      return $pagination;
    },
    //Get Contributors of array of Publications
    getPublicationsContributors: function(publications, contributorTypes){
      var query = 'prefix press: <'+this.prefix+'> \n';
      query += 'SELECT * WHERE { \n';
      if (!$.isArray(publications) || publications.length === 0) return;
      var i=0;
      for (var key in this.personFields) {
       if (this.personFields.hasOwnProperty(key)) {
         if (key in contributorTypes){
           if (i !==0) query+= 'UNION ';
           query += '{\n';
           query += '?pub press:'+ key + ' ?' + key +'s. \n';
           query += 'FILTER(';
           for (var i=0; i<publications.length; i++){
             if (i>0) query += '||';
             query += '?pub = <'+ publications[i] + '> ';
           }
           query += '). \n';
           query += '?pub press:Year ?year. \n';
           query += 'BIND(concat(str(?year), str(?pub)) as ?order). \n';
           query += 'BIND("'+key+'" as ?type). \n';
           query += '?'+key+'s press:slot ?'+key+'slot. \n';
           query += '?'+key+'slot press:list_item ?'+key+'uuid. \n';
           query += '?'+key+'slot press:list_index ?'+key+'index. \n';
           query += 'OPTIONAL{?'+key+'uuid foaf:givenName ?'+key+'givenName}. \n';
           query += '?'+key+'uuid foaf:familyName ?'+key+'familyName. } \n';
           i++;
         }
       }
      }
      query += '}order by desc(?order)';


      return this.getQuery(query, 0, 0);
    },
    //Get properties with multiple values of publications based on pub uuid
    getPublicationsMultipleFields: function(publications){
      if (!$.isArray(publications) || publications.length === 0) return;
      var query = 'prefix press: <'+this.prefix+'> \n';
      query += 'SELECT * WHERE { \n';
      // query += '{\n';
      // query += '?pub press:belongsTo ?org. \n';
      // query += 'FILTER (';
      // for (var i=0; i<publications.length; i++){
      //   if (i>0) query += '||';
      //   query += '?pub = <'+ publications[i] + '> ';
      // }
      // query += '). \n';
      // query += '?org press:Organization_Name ?orgName. \n';
      // query += '}UNION{ \n';
      query += '?pub press:Tag ?Tag. \n';
      query += 'FILTER (';
      for (var i=0; i<publications.length; i++){
        if (i>0) query += '||';
        query += '?pub = <'+ publications[i] + '> ';
      }
      query += '). \n';
      query += '} \n';
      // query += '}\n';

      return this.getQuery(query, 0, 0);
    },
    //Get values for filter usage
    getFiltersValues($elements){
      values = {
        year: {},
        category: {},
        tags: {},
        org: {},
        contributors: {}
      }
      $('.search-filter-year[data-selected="selected"]', $elements).each(function(){
        values.year[$(this).attr('data-oVal')] = [];
        values.year[$(this).attr('data-oVal')].push('?pub '+$(this).attr('data-p')+' '+$(this).attr('data-oVal')+'. \n');
      });

      $('.search-filter-category[data-selected="selected"]', $elements).each(function(){
        values.category[$(this).attr('data-oVal')] = [];
        values.category[$(this).attr('data-oVal')].push('?pub '+$(this).attr('data-p')+' '+$(this).attr('data-oVal')+'. \n');
      });

      $('.search-filter-tags[data-selected="selected"]', $elements).each(function(){
        values.tags[$(this).attr('data-oVal')] = [];
        values.tags[$(this).attr('data-oVal')].push('?pub '+$(this).attr('data-p')+' '+$(this).attr('data-oVal')+'. \n');
      });

      //TODO CHANGE FOR MULTIPLE ORGS
      $('.search-filter-org[data-selected="selected"]', $elements).each(function(){
        values.org[$(this).attr('data-oVal')] = [];
        values.org[$(this).attr('data-oVal')].push('?pub '+$(this).attr('data-p')+' '+$(this).attr('data-oVal')+'. \n');
      });


      $('.search-filter-contributor[data-selected="selected"]', $elements).each(function(index){
          var contributorQuery = '';
          contributorQuery += '?filterSlot'+index+' press:list_item '+$(this).attr('data-oVal')+'. \n';
          contributorQuery += '?filterList'+index+' press:slot ?filterSlot'+index+'. \n';
          contributorQuery += '?pub ?filterCon ?filterList'+index+'. \n';
          values.contributors[$(this).attr('data-oVal')] = [];
          values.contributors[$(this).attr('data-oVal')].push(contributorQuery);
        });

      if ($('.search-filter-contributor[data-selected="selected"]', $elements).length > 0)
        values.contributors.intro = '?filterCon rdfs:subPropertyOf* press:contributor. \n';

      return values;
    },
    //Get the available filters of results
    getFilters: function(prefixQuery, searchQuery){
      var completeQuery = prefixQuery +
                          'SELECT ?p ?o (count(?o) as ?oCount) WHERE {{ \n'+
                          searchQuery+
                          '?pub rdf:type [rdfs:subClassOf* press:Publication]. \n'+
                          '?pub ?p ?o. \n'+
                          'FILTER (?p = press:Year || ?p = press:belongsTo || ?p = rdf:type || ?p = press:Tag)\n'+
                          '}} group by ?p ?o order by desc(?oCount)';
      return this.getQuery(completeQuery);
    },
    getAuthorFilters: function(prefixQuery, searchQuery){
      var completeQuery = prefixQuery;
      if (prefixQuery.indexOf('bds') === -1){
        completeQuery += 'prefix bds: <http://www.bigdata.com/rdf/search#> \n';
      }
      completeQuery += 'SELECT ?contributoruuid ?contributorgivenName '+
                          '?contributorfamilyName (count(?contributoruuid) as ?pubcount) WHERE { \n'+
                          searchQuery+
                          '?contributor rdfs:subPropertyOf* press:contributor. \n'+
                          '?pub ?contributor ?contributors. \n'+
                          '?contributors press:slot ?contributorslot. \n'+
                          '?contributorslot press:list_item ?contributoruuid. \n'+
                          'OPTIONAL{?contributoruuid foaf:givenName ?contributorgivenName}. \n'+
	                        '?contributoruuid foaf:familyName ?contributorfamilyName. \n'+
                          '}group by ?contributoruuid ?contributorgivenName ?contributorfamilyName order by desc(?pubcount) limit 15';
      return this.getQuery(completeQuery);
    },
    //Get count of results of query
    getCount: function(prefixQuery, searchQuery){
      var completeQuery = prefixQuery +
                          'SELECT (count(distinct ?pub) as ?count) WHERE {{ \n'+
                          searchQuery+
                          '?pub rdf:type [rdfs:subClassOf* press:Publication]. \n'+
                          '}} order by desc(?o)';
      return this.getQuery(completeQuery);
    },
    clearSearchInput: function(){
      $('#free-text', this.element).val('');
    },
    clearAdvancedSearch: function(){
      $('input', this.advanced_search).val('');
      $('select', this.advanced_search).val('');
      $('#subcategory', this.advanced_search).attr('disabled', true);
      $('input[type="checkbox"]').prop('checked', false);
      $('.editable', this.advanced_search).empty();
      $('.editable', this.advanced_search).hide();
    },
    //Insert Search results
    insertSearchResults: function(responsePublications, responseContributors, responseMultipleFields, requiredFields, searchLabel, offset, count){

      var limit = 10;
      this.results.empty();
      if(count === 0){
        this.loader.hide();
        this.results.append('<h3 class="col-sm-12">No Results</h3>');
        this.results.append('<h4 class="col-xs-12">'+searchLabel+'</h4>');
        return;
      }else if (count === 1){
        this.results.append('<h3 class="col-sm-12">1 Result</h3>');
      }else{
        this.results.append('<h3 class="col-sm-12">'+count+' Results</h3>');
      }
      if (searchLabel === ''){
        searchLabel = this.lastSearchLabel;
      }
      this.results.append('<h4 class="col-xs-12">'+searchLabel+'</h4><p>&nbsp;</p>');

      var results = $.extend(true, [], responsePublications.results.bindings);
      var contributorResults = $.extend(true, [], responseContributors.results.bindings);
      var contributors = {};

      for(var i =0; i<contributorResults.length; i++){
        if (!(contributorResults[i].pub.value in contributors)){
          contributors[contributorResults[i].pub.value] = {};
        }
        if (!($.isArray(contributors[contributorResults[i].pub.value][contributorResults[i].type.value]))){
          contributors[contributorResults[i].pub.value][contributorResults[i].type.value] = [];
        }
        contributors[contributorResults[i].pub.value][contributorResults[i].type.value].push(contributorResults[i]);
      }

      for (var key in contributors){
        for (var typeKey in contributors[key]){
          contributors[key][typeKey].sort(function (a,b){
            return a[typeKey+'index'].value - b[typeKey+'index'].value;
          });
        }
      }
      var resultsMultipleFields = responseMultipleFields.results.bindings;
      var multipleFields = {};
      for (var i=0; i<resultsMultipleFields.length; i++){
        var field = resultsMultipleFields[i];
        if (!(field.pub.value in multipleFields)){
          multipleFields[field.pub.value] = {};
        }
        var type = '';
        if ('orgName' in field){
          type = 'orgName';
        }else if ('Tag' in field){
          type = 'Tag';
        }
        if (!($.isArray(multipleFields[field.pub.value][type]))){
          multipleFields[field.pub.value][type] = [];
        }

        multipleFields[field.pub.value][type].push(field[type].value);
      }

      var $container = $('<div></div>');
      //Start inserting results
      for(var i=0; i<results.length; i++){

        var title='';
        var titleField = this.titleFields[this.categoryAncestors[results[i].typeID.value]][results[i].typeID.value];

        if (results[i][titleField]){
          title = results[i][titleField].value;
        }
        if(!title || title === ''){
          if ('English_Title' in results[i]){
            title = results[i].English_Title.value;
          }else if('Book_Title' in results[i]){
            title = results[i].Book_Title.value;
          }
        }

        var info_color = this.categoryColor[this.categoryAncestors[results[i].typeID.value]];
        var current_pub = results[i];
        var $row = $('<div class="row"></div>');
        var $icons = $('<div class="col-sm-2" style="padding-top:3px"></div>');

        if ('Local_Link' in current_pub){
          var $download_icon = $('<a target="_blank" href="'+current_pub.Local_Link.value+'" class="result-icons" data-toggle="tooltip" '+
            'data-placement="top" data-container="body" title="Download the PDF of '+
            'this Publication" style="color:inherit">'+
            '<i class="fa fa-download" style="font-size:17px;"></i></a>');
          $download_icon.mouseover(function(e){$(this).tooltip();});
          $download_icon.mouseover();
          if (!this.current_user.anonymous){
            $icons.append($download_icon);
          }
        }

        var $info_icon = $('<a  class="result-icons" data-toggle="tooltip" '+
        'data-placement="top" data-container="body" title="'+
        this.category_labels[results[i].typeID.value]+'" style="color:inherit">'+
            '<i class=" fa fa-info-circle" style="font-size:17px;display:block;'+
        'color:'+info_color+'"></i></a>');
        var $edit_icon = $('<a href="'+this.base_url+'/publication/edit?uuid='+
            encodeURIComponent(current_pub.pub.value)+'&category='+
            encodeURIComponent(current_pub.typeID.value)+'" target="_blank" '+
            'class="result-icons" style="color:inherit"><i class="fa fa-edit" '+
            'style="font-size:17px;font-weight:bold;"></i></a>');
        if('Publication_URL' in current_pub){
          var $share_icon_div = this.createShareButton(window.location.origin + '/'+current_pub.Publication_URL.value, title+' | PRESS Publication System');
          var $share_icon = $('<a  class="result-icons share-btn"><i class="fa fa-share-alt" style="font-size:17px;"></i></a>');
          $share_icon_div.prepend($share_icon);
          $icons.append($share_icon_div);
          $info_icon.attr('href', this.base_url+'/'+current_pub.Publication_URL.value);
          $info_icon.attr('target', 'target="_blank"');
        }
        $info_icon.mouseover(function(e){$(this).tooltip();});
        $info_icon.mouseover();



        $icons.append($info_icon);

        var addEdit = false;
        if(!this.current_user.anonymous && $.inArray('Power User', this.current_user.roles) > -1 ){
          addEdit = true;
        }

        var $pub_info = $('<div class="col-sm-10"></div>');

        if (current_pub.pub.value in contributors){
          for (var j =0; j< this.contributorOrder[current_pub.typeID.value].length; j++){
            current_contributor_type = this.contributorOrder[current_pub.typeID.value][j];
            if (current_contributor_type in contributors[current_pub.pub.value]){
              length = contributors[current_pub.pub.value][current_contributor_type].length;
              for (var x=0; x< length; x++){
                var current_contributor = contributors[current_pub.pub.value][current_contributor_type][x];
                if ((j>0 && x <length-1) || (j === 0 && x>0)){
                  $pub_info.append(', ');
                }

                if(!this.current_user.anonymous && addEdit === false){
                  if('urn:uuid:' + this.current_user.uuid === current_contributor[current_contributor_type+'uuid'].value){
                    addEdit = true;
                  }
                }

                var givenName = '';
                if ((current_contributor_type+'givenName') in current_contributor){
                  givenName = current_contributor[current_contributor_type+'givenName'].value;
                }
                var fullName = givenName+' '+current_contributor[current_contributor_type+'familyName'].value;
                var $author_link = $('<a  data-uuid="'+current_contributor[current_contributor_type+'uuid'].value+'">'+fullName+'</a>');
                $author_link.click((function(that){
                  return function(){
                    that.clearSearchInput();
                    that.clearAdvancedSearch();
                    $('#author-editable', that.advanced_search).
                      append('<li class="list-group-item" draggable="false" '+
                          'style="float:left"><span class="author-contributor-name '+
                          'contributor" data-uuid="'+$(this).attr('data-uuid')+'" '+
                          'data-field="author">'+$(this).text()+'</span><i class="js-remove">&nbsp;✖</i></li>');
                    $('#author-editable', that.advanced_search).show();
                    that.searchByFields();
                    that.clearAdvancedSearch();
                  };
                })(this));
                $pub_info.append($author_link);
              }
            }
          }
        }
        if(addEdit){
          $icons.append($edit_icon);
        }

        var External_Link = '';
        if ('External_Link' in results[i]){
          $pub_info.append($('<a href="'+results[i].External_Link.value+'" target="_blank"><h5><strong>'+title+'</strong></h5></a>'));
        }else{
          $pub_info.append($('<h5><strong>'+title+'</strong></h5>'));
        }
        // if ('orgName' in multipleFields[current_pub.pub.value]){
        //   for (var r=0; r<multipleFields[current_pub.pub.value].orgName.length; r++){
        //     $pub_info.append(multipleFields[current_pub.pub.value].orgName[r]);
        //     $pub_info.append(', ');
        //   }
        // }
        $pub_info.append(results[i].year.value);

        if (multipleFields[current_pub.pub.value] && 'Tag' in multipleFields[current_pub.pub.value]){
          var $tagDiv = $('<div class="col-xs-12 pub-tags">Tags: </div>');
          for (var r=0; r<multipleFields[current_pub.pub.value].Tag.length; r++){
            var $span = $('<span class="pub-tag-item">'+multipleFields[current_pub.pub.value].Tag[r]+'</span>');
            $span.click((function(that){
              return function(){
                that.clearSearchInput();
                that.clearAdvancedSearch();
                $('#tag-editable', that.advanced_search).append($('<li id="'+$(this).text()+'" class="tag-item list-group-item" draggable="false" style="float:left"></li>'));
                that.searchByFields();
                that.clearAdvancedSearch();
              };
            })(this));
            $tagDiv.append($span);
          }
          $pub_info.append($tagDiv);
        }
        $row.append($icons);
        $row.append($pub_info);
        $container.append($row);
        $container.append('<br>');
      }
      // this.results.empty();
      this.results.append($container);

      this.loader.hide();
    },
    insertFilters: function(fieldResponse, contributorResponse, selected){
      this.filters.empty();

      this.filters.append('<h3>FILTERS</h3><hr/>');
      this.filterLoader.hide();
      this.filters.append(this.filterLoader);

      var contributorResults = contributorResponse.results.bindings;

      var contributors = [];

      this.filters.append('<h4 class="col-xs-12">Authors</h4>');
      var contributorsDiv = $('<div class="col-xs-12"></div>');
      for (var i=0; i<contributorResults.length; i++){
        var contributorDiv = $('<div class="search-filter search-filter-contributor" data-p="contributor" '+
            'data-o="?contributor" data-oVal="<'+contributorResults[i].contributoruuid.value+'>"></div>');
        var name = '';
        if ('contributorgivenName' in contributorResults[i]){
          name = contributorResults[i].contributorgivenName.value + ' ';
        }
        name += contributorResults[i].contributorfamilyName.value;
        var contributor = $('<a  class="col-xs-12" style="display:block">'+name+' <i style="color:grey">['+contributorResults[i].pubcount.value+']</i></a>');
        contributorDiv.append(contributor);
        contributorsDiv.append(contributorDiv);

        if (selected !== undefined){
          if(selected.contributors[contributorDiv.attr('data-oval')]){
            contributorDiv.attr('data-selected', 'selected');
          }
        }
      }
      this.filters.append(contributorsDiv);


      var results = fieldResponse.results.bindings;

      var years = [];
      var orgs = [];
      var categories = [];
      var tags = [];

      for (var i=0; i<results.length; i++){
        switch (results[i].p.value) {
          case this.prefix+'Year':
            years.push({val: parseInt(results[i].o.value), count: parseInt(results[i].oCount.value)});
            break;
          case this.prefix+'belongsTo':
            orgs.push({val: results[i].o.value, count: parseInt(results[i].oCount.value)});
            break;
          case 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type':
            categories.push({val: results[i].o.value, count: parseInt(results[i].oCount.value)});
            break;
          case this.prefix+'Tag':
            tags.push({val: results[i].o.value, count: parseInt(results[i].oCount.value)});
            break;
          default:
            console.error('Insert Filter Error. Unknown value type '+ results[i].p.value);
        }
      }
      years = years.sort(function(a,b){return b.val-a.val;});
      orgs = orgs.sort(function(a,b){return b.count-a.count;});
      categories = categories.sort(function(a,b){return b.count-a.count;});
      tags = tags.sort(function(a,b){return b.count-a.count;});
      // console.log(years);
      // console.log(orgs);
      // console.log(categories);
      // console.log(tags);

      this.filters.append('<h4 class="col-xs-12">Tags</h4>');
      var tagsDiv = $('<div class="col-xs-12"></div>');
      for(var i=0; i<tags.length; i++){
        var tagDiv = $('<div class="search-filter search-filter-tags" data-p="press:Tag" '+
            'data-o="?Tag" data-oVal="&quot;'+tags[i].val+'&quot;" style="width:40%"></div>');

        var tag = $('<a >'+tags[i].val+' <i style="color:grey">['+tags[i].count+']</i></a>');
        tagDiv.append(tag);
        tagsDiv.append(tagDiv);
        if (selected !== undefined){
          if(selected.tags[tagDiv.attr('data-oval')]){
            tagDiv.attr('data-selected', 'selected');
          }
        }
        tagsDiv.append(' ');
      }
      this.filters.append(tagsDiv);


      this.filters.append('<h4 class="col-xs-12">Year</h4>');
      var yearsDiv = $('<div class="col-xs-12"></div>');
      for(var i=0; i<years.length; i++){
        var yearDiv = $('<div class="search-filter search-filter-year" data-p="press:Year" '+
            'data-o="?year" data-oVal="&quot;'+years[i].val+'&quot;" style="width:40%"></div>');

        var year = $('<a >'+years[i].val+' <i style="color:grey">['+years[i].count+']</i></a>');
        yearDiv.append(year);
        yearsDiv.append(yearDiv);
        if (selected !== undefined){
          if(selected.year[yearDiv.attr('data-oval')]){
            yearDiv.attr('data-selected', 'selected');
          }
        }
        yearsDiv.append(' ');
      }
      this.filters.append(yearsDiv);

      this.filters.append('<h4 class="col-xs-12">Category</h4>');
      var categoriesDiv = $('<div class="col-xs-12"></div>');
      for(var i=0; i<categories.length; i++){
        var categoryDiv = $('<div class="search-filter search-filter-category" data-p="rdf:type" '+
            'data-o="?type" data-oVal ="<'+categories[i].val+'>"></div>');
        var category = $('<a  class="col-xs-12" style="display:block;">'+
            this.category_labels[categories[i].val.split('#')[1]]+' <i style="color:grey">['+categories[i].count+']</i></a>');
        categoryDiv.append(category);
        categoriesDiv.append(categoryDiv);

        if (selected !== undefined){
          if(selected.category[categoryDiv.attr('data-oval')]){
            categoryDiv.attr('data-selected', 'selected');
          }
        }
      }
      this.filters.append(categoriesDiv);

      this.filters.append('<h4 class="col-xs-12">Organization</h4>');
      var orgsDiv = $('<div class="col-xs-12"></div>');
      for(var i=0; i<orgs.length; i++){
        var orgDiv = $('<div class="search-filter search-filter-org" data-p="press:belongsTo" '+
            'data-o="?org" data-oVal ="<'+orgs[i].val+'>"></div>');
        var org = $('<a  class="col-xs-12" style="display:block;">'+
            orgs[i].val.split('#')[1]+' <i style="color:grey">['+orgs[i].count+']</i></a>');
        orgDiv.append(org);
        orgsDiv.append(orgDiv);

        if (selected !== undefined){
          if(selected.org[orgDiv.attr('data-oval')]){
            orgDiv.attr('data-selected', 'selected');
          }
        }
      }
      this.filters.append(orgsDiv);

      function onFilterClick(that){
        return function(){
          that.filterLoader.show();
          if($(this).attr('data-selected') === 'selected'){
            $(this).removeAttr('data-selected');
            $(this).siblings().show();
          }else{
            $(this).attr('data-selected', 'selected');
          }

          if (that.currentSearchMode === 'category'){
            that.searchByCategory();
          }else if (that.currentSearchMode === 'fields'){
            that.searchByFields();
          }
        };
      }

      this.filters.append($('<button>', {
        text: 'Clear',
        id: 'filterClear',
        type: 'button',
        class: 'btn btn-default btn-sm',
        style: 'float:right;',
        click: (function(that) {
              return function(){
                $('.search-filter[data-selected="selected"]', that.filters).removeAttr('data-selected');
                // that.getByFilters(that);
                if (that.currentSearchMode === 'category'){
                  that.searchByCategory();
                }else if (that.currentSearchMode === 'fields'){
                  that.searchByFields();
                }
              };
            })(this)
        }));

      $('.search-filter', this.filters).click(onFilterClick(this));

      // console.log(this.lastQueryWithoutFilters[0]);
    },
    getQuery: function(q, limit, offset){
      if (typeof limit === 'undefined'){
        limit = 0;
      }
      if (typeof offset === 'undefined'){
        offset = 0;
      }
      if (limit > 0){
        q += ' limit '+ limit;
      }
      if (offset > 0){
        q += ' offset '+ offset;
      }
      return $.ajax({
        dataType: 'json',
        method: "GET",
        url: this.dbURL,
        data: {
          query: q
        }
      })
      .done(function(response) {
        return response;
      })
      .fail(function(response) {
        alert(response);
        console.error(response);
      });
    },
    createShareButton: function(url, title){
      var encodedUrl = encodeURIComponent(url);
      var encodedTitle = encodeURIComponent(title);
      var $shareHtml = $('<div class="share-button sharer" style="display: block;">'+
        '<div class="social top center networks-5 ">'+
          '<!-- Facebook Share Button -->'+
          '<a class="fbtn share facebook" href="https://www.facebook.com/sharer/sharer.php?u='+encodedUrl+'"><i class="fa fa-facebook"></i></a> '+

          '<!-- Google Plus Share Button -->'+
          '<a class="fbtn share gplus" href="https://plus.google.com/share?url='+encodedUrl+'"><i class="fa fa-google-plus"></i></a> '+

          '<!-- Twitter Share Button -->'+
          '<a class="fbtn share twitter" href="https://twitter.com/intent/tweet?text='+encodedTitle+'&amp;url='+encodedUrl+'"><i class="fa fa-twitter"></i></a> '+

          '<!-- LinkedIn Share Button -->'+
          '<a class="fbtn share linkedin" href="http://www.linkedin.com/shareArticle?mini=true&amp;url='+encodedUrl+'&amp;title='+encodedTitle+'&amp;source='+encodedUrl+'/"><i class="fa fa-linkedin"></i></a>'+
        '</div>'+
      '</div>');

      $('a.fbtn', $shareHtml).click(function(e){
        e.preventDefault();
        window.open($(this).attr('href'), 'shareWindow', 'height=450, width=550,top='+
            ($(window).height() / 2 - 275) + ', left=' + ($(window).width() / 2 - 225) +
            ', toolbar=0, location=0, menubar=0, directories=0, scrollbars=0');
        return false;
      });
      return $shareHtml;
    },
  };

  $.fn.pressSearch = function(options, callback) {
    this.each(function() {
      var el = $(this);
      if (el.data('pressSearch'))
        el.data('pressSearch').remove();
      el.data('pressSearch', new PRESSSearch(el, options, callback));
    });
    return this;
  };

  return PRESSSearch;
}));
