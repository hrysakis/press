// Copyright FORTH-ICS, Emmanouil Dermitzakis

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Make globaly available as well
    define(['jquery'], function(jquery) {
      return (root.press = factory(jquery));
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

  var PRESS = function(element, options, cb) {

    this.dbURL = "";
    this.prefix = "";
    this.category_tree = {};
    this.element = $(element);
    this.fieldElement = $('<div id="form-fields"></div>');
    this.fields = {};
    this.project_ids = {};
    this.project_names = [];
    this.projects = [];
    this.labs = {};
    this.authorGroups = {};
    this.current_user = {};
    this.JSONfields = JSONfields;
    this.contributorOrder = JSONContributorOrder;
    this.personFields = personFields;
    this.titleFields = titleFields;
    this.requiredFields = JSONrequiredFields;
    this.bloodhounds = {};
    this.leftButtonArea = $('<div class="col-sm-6" id="leftButtonArea"></div>');
    this.rightButtonArea = $('<div class="col-sm-6" id="rightButtonArea" style="float:right"></div>');
    this.buttonArea = $('<div id="buttonArea"></div>');
    this.buttonArea.append(this.leftButtonArea);
    this.buttonArea.append(this.rightButtonArea);
    this.cat;
    this.subcat;
    this.doiCategoriesToPRESS = doiCategoriesToPRESS;
    this.doiModal;
    this.doiFieldsToPRESS = doiFieldsToPRESS;
    this.oldFields = {};
    this.organization_label = 'Organization';
    this.externalAuthorModal;
    this.tags = [];

    this.editMode = false;
    this.editPublication = {};
    this.deleteModal;

    this.categoryAncestors = {};
    this.categoryDescendants = {};

    function findDescendants(object, descendantObject, depth){
      for (key in object){
        if (typeof object[key] === 'object' && !($.isArray(object[key]))){
          descendantObject.push(key);
          descendantObject = findDescendants(object[key], descendantObject, depth+1);
        }else if($.isArray(object[key])){
          descendantObject.push(key);

        }
      }
      return descendantObject;
    }

    for (key in this.JSONfields){
      this.categoryDescendants[key] = [];
      this.categoryDescendants[key] = findDescendants(this.JSONfields[key], this.categoryDescendants[key], 0);
    }


    for (key in this.categoryDescendants){
      for (var i=0; i< this.categoryDescendants[key].length; i++){
        this.categoryAncestors[this.categoryDescendants[key][i]] = key;
      }
    }

    String.prototype.escapeHtml = function(){
      var entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
      };
      return this.replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
      });
    }

    String.prototype.escapeSpecialChars = function() {
      return this.replace(/\n/g, "\\n");
    };



    //custom options from user
    if (typeof options !== 'object' || options === null)
      options = {};

    //allow setting options with data attributes
    //data-api options will be overwritten with custom javascript options
    options = $.extend(this.element.data(), options);

    if (typeof options.dbURL === 'string')
      this.dbURL = options.dbURL;

    if (typeof options.prefix === 'string')
      this.prefix = options.prefix;

    if (typeof options.prefix === 'string')
      this.organization_label = options.organization_label;

    if (typeof options.labs === 'object')
      this.labs = options.labs;

    if (typeof options.current_user === 'object')
      this.current_user = options.current_user;

    if (typeof options.authorGroups === 'object')
      this.authorGroups = options.authorGroups;

    if (typeof options.editMode === 'boolean')
      this.editMode = options.editMode;

    if (typeof options.editPublication === 'object')
      this.editPublication = options.editPublication;


    this.loader = $('<div id="loader"></div>');
    this.loader.hide();
    console.log(this.loader);
    console.log(typeof this.loader);
    console.log(this.element);
    console.log(typeof this.element);
    this.loader.show();
    this.element.append(this.loader);
    console.log(5);
    $.when(this.getTags(), this.getCategories(), this.getDataProperties()).always($.proxy(function(a1, a2, a3) {
      if (!(a1[1] === "success" && a2[1] === "success" && a3[1] === "success")) {
        console.error('GET was unsuccesfull');
        return;
      }

      this.loader.hide();

      this.insertLabs(this.labs);

      this.insertCategories(this.category_tree);

      this.element.append(this.fieldElement);

      this.element.append($('<p>&nbsp;</p>'));

      this.element.append(this.buttonArea);
      this.insertButtons();

      this.doiModal = this.createDOImodal();
      this.element.append(this.doiModal);

      var non_existing = [];
      var my_fields = this.fields;

      function checkExistance(fields) {
        if (typeof fields === 'object' && !Array.isArray(fields)) {
          for (key in fields) {
            checkExistance(fields[key]);
          }
        } else if (Array.isArray(fields)) {
          for (var i = 0; i < fields.length; i++) {
            checkExistance(fields[i]);
          }
        } else if (typeof fields === 'string') {
          if ($.inArray(fields, my_fields) === -1 && $.inArray(fields, non_existing) === -1) {
            non_existing[non_existing.length] = fields;
          }
        }
      }
      checkExistance(JSONfields);

      if(this.editMode){      //Edit Mode
        var categories = this.JSONfields;

        function findFields(object, id){    //Get Fields of Certain Category
          if (id in object && $.isArray(object[id])){
            return object[id];
          }
          if (!$.isArray(object)){
            for (key in object){
              var result = findFields(object[key], id);
              if ($.isArray(result)) return result;
            }
          }
        }
        var pubFields = findFields(categories, this.editPublication.category);

        var except = Object.keys(this.personFields);
        except.push('project');
        except.push('Tag');

        var query = 'prefix press: <' + this.prefix + '>';
        query += 'SELECT * WHERE{ \n';
        query += '{?pub press:Publication_UUID "'+this.editPublication.uuid+'". \n';
        for(var i=0; i<pubFields.length; i++){
          if(typeof pubFields[i] === 'string'){
            if (!except.includes(pubFields[i]))
              query += 'OPTIONAL {?pub press:'+pubFields[i]+ ' ?'+pubFields[i]+ '}. \n';
          }else {
            for(var j=0; j<pubFields[i].length; j++){
              if(typeof pubFields[i][j] === 'string'){
                if (!except.includes(pubFields[i]))
                  query += 'OPTIONAL {?pub press:'+pubFields[i][j]+ ' ?'+pubFields[i][j]+ '}. \n';
              }
            }
          }
        }

        query += '}UNION{';

        query += '?pub press:Publication_UUID "'+this.editPublication.uuid+'". \n';
        query += '?pub press:appearsIn ?project. \n';
        query += '?project press:Project_Name ?projectName. \n';
        query += '}UNION{ \n';
        query += '?pub press:Publication_UUID "'+this.editPublication.uuid+'". \n';
        query += '?con rdfs:subPropertyOf* press:contributor. \n';
        query += '?pub ?con ?conList. \n';
        query += '?conList press:slot ?conSlot. \n';
        query += '?conSlot press:list_item ?person. \n';
        query += '?conSlot press:list_index ?personIndex. \n';
        query += '?person foaf:familyName ?familyName. \n';
        query += '?person press:Person_Group ?group. \n';
        query += 'OPTIONAL {?person foaf:givenName ?givenName.}. \n';
        query += 'OPTIONAL {?person foaf:mbox ?mbox.}. \n';
        query += '}UNION{ \n';
      	query += '?pub press:Publication_UUID "'+this.editPublication.uuid+'". \n';
        query += '?pub press:belongsTo ?org. \n';
        query += '?org press:Organization_Name ?orgName. \n';
        query += '} UNION {\n';
        query += '?pub press:Publication_UUID "'+this.editPublication.uuid+'". \n';
        query += '?pub press:Tag ?Tag. \n';
        query += '} \n';
        query += '} \n';

        this.getPublicationInfo(query);
      }

    }, this));
  };

  PRESS.prototype = {
    constructor: PRESS,
    setdbURL: function(url) { //Set dbURL
      this.dbURL = url;
    },
    getPublicationInfo: function(query) {
      $.ajax({
        dataType: 'json',
        method: 'GET',
        url: this.dbURL,
        data: {
          query: query
        }
      }).done($.proxy(function(response){
        this.insertData(response);
      }, this))
      .fail(function(response){
        console.error(response);
        alert('Error Retrieving Publication Info');
      })
    },
    insertData: function(response){
      results = response.results.bindings;

      var category = this.categoryAncestors[this.editPublication.category];
      var subcategory = this.editPublication.category;

      this.cat.val(category);
      this.cat.change();
      this.subcat.val(subcategory);
      this.subcat.change();

      var contributors = {};
      for (var i=0; i<results.length; i++){
        if ('org' in results[i]){
          var $ul = $('#lab-editable', this.element);
          if ($.inArray('Power User', this.current_user.roles) === -1 &&
              results[i].org.value.split('#')[1] === this.labs[this.current_user.lab]) {
            var valid = true;
            $('.lab-item').each($.proxy(function(index, element) {
              if ($(element).attr('id') === this.labs[this.current_user.lab]) {
                return valid = false;
              }
            }, this));
            if (valid){
              $ul.append($('<li id="'+this.labs[this.current_user.lab]+'" class="lab-item list-group-item" draggable="false" style="float:left">' + this.labs[this.current_user.lab] + '</li>'));
              $ul.show();
            }
          }else{
            var $li = $('<li id="'+results[i].org.value.split('#')[1]+'" class="extra-lab-item lab-item list-group-item" draggable="false" style="float:left"></li>');
            $ul.append($li);
            $li.html(results[i].orgName.value);
            $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
            $ul.show();
          }
        }else if('con' in results[i]){
          var conType = results[i].con.value.split('#')[1];
          if (!(conType in contributors)){
            contributors[conType] = [];
          }
          var $li = $('<li class="list-group-item" draggable="false" style="float:left;"></li>');
          var mail = '';
          if ('mbox' in results[i]){
            mail = 'data-mail="'+results[i].mbox.value.substring(7)+'"';
            $li.attr('title', results[i].mbox.value.substring(7));
          }
          var author_group = "";
          for (key in this.authorGroups){
            if (results[i].group.value === key && ('span' in this.authorGroups[key])){
              author_group = this.authorGroups[key].span;
            }
          }

          var fullName = '';
          if('givenName' in results[i]){
            fullName = results[i].givenName.value + ' ';
          }
          fullName += results[i].familyName.value;

          $li.html(author_group + '<span class="' + conType + '-contributor-name'+
            ' contributor" data-uuid="'+results[i].person.value+'" data-field="'+conType+
            '" ' +mail + '>' + fullName + '</span>');

          $('<i class="js-remove">✖</i>').appendTo($li);
          contributors[conType].push({
            element: $li,
            index: parseInt(results[i].personIndex.value)
          });
        }else if ('project' in results[i]){ //TODO Add Projects

        }else if ('Tag' in results[i]){
          var $list = $('#tag-editable', this.element);
          var $li = $('<li id="'+results[i].Tag.value+'" class="tag-item list-group-item" draggable="false" style="float:left"></li>');

          $list.append($li);
          $li.html(results[i].Tag.value);
          $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
          $list.show();
        }else{
          for (key in results[i]){
            if(key.indexOf('Date') > -1){
              $('#'+key, this.element).data('daterangepicker').setStartDate(results[i][key].value);
              $('#'+key, this.element).data('daterangepicker').setEndDate(results[i][key].value);
            }else if (key === 'Local_Link'){
              $('#'+key, this.element).parent().parent().append('<div><div class="col-sm-2"></div>'+
                '<small class="col-sm-10"><a href="/'+results[i][key].value+'" target="_blank">Current File</a>'+
                '. Leave blank to keep the same file</small></div>');
            }else{
              $('#'+key, this.element).val(results[i][key].value);    //TODO FIX Local_Link, pdf edit
            }
          }
        }
        for(key in contributors){
          var $conEditable = $('#'+key+'-editable', this.element);
          contributors[key].sort(function(a, b){return a.index - b.index});
          for (var j=0; j<contributors[key].length; j++){
            $conEditable.append(contributors[key][j].element);
          }
          $conEditable.show();
        }
      }
    },
    //Get Categories
    getCategories: function() {
      return $.ajax({

          dataType: 'json',
          method: "GET",
          url: this.dbURL,
          data: {
            query: "prefix press: <" + this.prefix + "> " +
              'SELECT (strafter(str(?low), "#") AS ?lowid) ?lowlabel ?optgroup ' +
              '(strafter(str(?superclass), "#") AS ?superclassid) ?superlabel ' +
              "WHERE { " +
              "?low rdfs:subClassOf* press:Publication. " +
              "OPTIONAL {?low rdfs:label ?lowlabel}. " +
              "OPTIONAL {?low press:optgroup ?optgroup}. " +
              "OPTIONAL {?low rdfs:subClassOf ?superclass . " +
              "?superclass rdfs:label ?superlabel} " +
              "} ORDER BY ?label"
          }
        })
        .done($.proxy(function(response) {
          var category_tree = {};
          results = response.results.bindings;

          function array_to_tree(array, father) {
            var tree = {};
            for (let i = 0; i < array.length; i++) {
              if ('superclassid' in array[i] && array[i]['superclassid'].value === father) {
                tree[array[i]['lowid'].value] = {};
                if ('lowlabel' in array[i]) {
                  tree[array[i]['lowid'].value].label = array[i]['lowlabel'].value;
                }
                if ('optgroup' in array[i]) {
                  tree[array[i]['lowid'].value].optgroup = array[i]['optgroup'].value;
                }
                tree[array[i]['lowid'].value]['children'] = array_to_tree(array, array[i]['lowid'].value);
              }
            }
            return tree;
          }

          category_tree = array_to_tree(results, 'Publication');
          return this.category_tree = category_tree;
        }, this))
        .fail(function(response) {
          alert(response);
        });
    },
    //Get Tags from Database
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
          for (var i = 0; i < response.results.bindings.length; i++) {
            tags[i] = response.results.bindings[i].tag.value;
          }
          this.tags = tags;
        }, this))
        .fail(function(response) {
          alert(response);
        });
    },
    //Get Data Properties of Categories
    getDataProperties: function() {
      return $.ajax({
          dataType: 'json',
          method: "GET",
          url: this.dbURL,
          data: {
            query: "prefix press: <" + this.prefix + "> " +
              'SELECT DISTINCT (strafter(str(?p), "#") AS ?pid) ?label (strafter(str(?type), "#") AS ?ptype) ?range ' +
              "WHERE { " +
              "?class ^rdfs:domain ?p . " +
              "?class rdfs:subClassOf* press:Publication . " +
              "?p rdf:type ?type . " +
              "OPTIONAL{?p rdfs:label ?label }. " +
              "FILTER (?type = owl:DatatypeProperty || ?type = owl:ObjectProperty) . " +
              "OPTIONAL {" +
              "?p rdfs:range ?range" +
              "}" +
              "}order by ?p "
          }
        })
        .done($.proxy(function(response) {
          results = response.results.bindings;
          var fields = {};
          for (let i = 0; i < results.length; i++) {
            fields[results[i].pid.value] = {
              id: results[i].pid.value,
              type: results[i].ptype.value,
              range: results[i].range.value,
            };
            if ('label' in results[i]) {
              fields[results[i].pid.value].label = results[i].label.value;
            }
          }
          this.fields = fields;
        }, this))
        .fail(function(response) {
          alert(response);
        });
      // this.fields = fields;
    },
    //Insert Lab Field using typeahead.js and sortable.js
    insertLabs: function(labs) {
      $input = $('<input class="typeahead form-control input-sm press-field" '+
          'id="lab-input" data-label="'+this.organization_label+'" type="text"/>');
      $ul = $('<ul id="lab-editable" class="list-group editable" style="display:none"></ul>');
      var $labgroup = $('<div id="lab-group" class="form-group"></div>');
      var $col_div = $('<div class="col-sm-10"></div>');
      $labgroup.append($('<label class="col-sm-2 control-label" for="lab-input"><span style="color:red">*</span>'+this.organization_label+':</label>'));
      $labgroup.append($col_div);
      $col_div.append($input);
      $col_div.append($ul);

      this.element.append($labgroup);

      var labValues = [];
      for (key in labs){
        labValues.push(labs[key]);
      }
      var labsBlood = new Bloodhound({
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        local: labValues
      });

      function labWithDefaults(q, sync) {
        if (q === '') {
          sync(labsBlood.index.all());
          // console.log(labsBlood.index.all());
        } else {
          labsBlood.search(q, sync);
        }
      }

      $input.typeahead({
        highlight: true,
        minLength: 0
      }, {
        limit: 100,
        name: 'labs',
        source: labWithDefaults
      });

      var sortable = Sortable.create($('#lab-editable')[0], {
        filter: '.js-remove',
        draggable: '.extra-lab-item',
        onFilter: function(evt) {
          parent = evt.item.parentNode;
          parent.removeChild(evt.item);

          if (parent.children.length === 0) {
            parent.style.display = "none";
          }
        }
      });

      if ($.inArray('Power User', this.current_user.roles) === -1) {
        $ul.append($('<li id="'+labs[this.current_user.lab]+'" class="lab-item list-group-item" draggable="false" style="float:left">' + labs[this.current_user.lab] + '</li>'));
        $ul.show();
      }

      $input.bind('typeahead:select', function(ev, suggestion) {
        var $list = $('#lab-editable');
        var valid = true;
        $('.lab-item').each(function() {
          if ($(this).attr('id') === suggestion) {
            return valid = false;
          }
        });
        if (valid) {
          var $li = $('<li id="'+suggestion+'" class="extra-lab-item lab-item list-group-item" draggable="false" style="float:left"></li>');
          $list.append($li);
          $li.html(suggestion);
          $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
          $list.show();
        }
        $(this).blur();
        setTimeout(function() {
          $('#lab-input').typeahead('val', '');
        }, 10);
      });
    },
    //Insert Category Fields
    insertCategories: function(category_tree) {
      this.cat = $('<select class="form-control input-sm" id="category"></select>');
      this.subcat = $('<select class="form-control input-sm" id="subcategory" disabled></select>');

      $catgroup = $('<div id="category-group" class="form-group"></div>');
      $col_div = $('<div class="col-sm-10"></div>');
      $catgroup.append($('<label class="col-sm-2 control-label" for="category"><span style="color:red">*</span>Category:</label>'));
      $catgroup.append($col_div);
      $col_div.append(this.cat);

      this.element.append($catgroup);

      $subcatgroup = $('<div id="subcategory-group" class="form-group"></div>');
      $sub_col_div = $('<div class="col-sm-10"></div>');
      $subcatgroup.append($('<label class="col-sm-2 control-label" for="subcategory"><span style="color:red">*</span>Subcategory:</label>'));
      $subcatgroup.append($sub_col_div);
      $sub_col_div.append(this.subcat);

      this.element.append($subcatgroup);

      this.cat.append($('<option value="">Select Category</option>'));
      this.subcat.append($('<option value="">Select Subcategory</option>'));
      for (key in category_tree) {
        this.cat.append($('<option value="' + key + '">' + category_tree[key].label + '</option>'));
      }

      this.cat.change((function(subcat) { //TODO: Keep Old Fields
        subcat.empty();

        $('#form-fields').hide();
        if ($(this).val() === '') {
          subcat.append($('<option value="">Select Subcategory</option>'));
          subcat.prop('disabled', 'disabled');
          return;
        }
        subcat.append($('<option value="">Select Subcategory</option>'));
        for (key in category_tree[$(this).val()].children) {
          if (category_tree[$(this).val()].children[key].optgroup) {
            var $opt = $('<optgroup id="' + key + '" label="' + category_tree[$(this).val()].children[key].label + '"></optgroup>');
            subcat.append($opt);
            for (key2 in category_tree[$(this).val()].children[key].children) {
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

      this.subcat.change($.proxy(function() { //TODO: Keep Old Fields
        var oldFields = {};

        $('input[type!=file], textarea', '#form-fields').each(function(){
          if ($(this).val() !== '')
            oldFields[$(this).attr('id')] = $(this).val();
        })
        this.oldFields = oldFields;
        $('#form-fields').empty();
        $('#form-fields').show();
        if (this.subcat.val() !== '') {
          var $selected = $(':selected', this.subcat);
          if($selected.parent().prop('tagName') === 'OPTGROUP'){
            this.insertFields(this.JSONfields[this.cat.val()][$selected.parent().attr('id')][this.subcat.val()],
                this.requiredFields[this.cat.val()][$selected.parent().attr('id')][this.subcat.val()]);
          }else{
            this.insertFields(this.JSONfields[this.cat.val()][this.subcat.val()],
                this.requiredFields[this.cat.val()][this.subcat.val()]);
          }
        }

      }, this));
    },
    //Insert Person/Contributor field, using typeahead.js and sortable.js
    insertPersonField: function(field, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $group = $('<div class="form-group"></div>')
      $group.attr('id', field.id + '-bloodhound');
      var $label = $('<label class="col-sm-2 control-label"></label>');
      $label.attr('for', field.id + '-input');
      $label.append(required);
      $label.append(field.label+':');
      var $d = $('<div class="col-sm-10"></div>');
      var tooltip = 'Each word has to be at least 3 characters long to search.\nPress Enter to add a new External Contributor.';
      var $input = $('<input class="person-input typeahead form-control input-sm '+
          'press-field" data-toggle="tooltip" type="text"/>');
      $input.attr('id', field.id+'-input');
      $input.attr('title', tooltip);
      $input.attr('data-label', field.label);
      $input.mouseover(function(e){$(this).tooltip()});
      $input.mouseover();
      $d.append($input);

      $group.append($label);
      $group.append($d);
      if (Object.keys(this.bloodhounds).length === 0) {
        for (key in this.authorGroups) {
          this.bloodhounds[key] = new Bloodhound({
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('tokens'),
            sufficient: 500,
            remote: {
              url:this.dbURL,
              wildcard: '%QUERY',
              // rateLimitBy: 'throttle',
              // rateLimitWait: 0,
              prepare: (function(groupKey, prefix){
                    return function(query, settings){
                // console.log(settings);

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
                }
                return settings;
              }})(key, this.prefix),
              transform: (function (groupKey){
                return function(response){
                  if (typeof response !== 'object') return [];
                  var tr=[];
                  var results = response.results.bindings;
                  for(let i=0; i<results.length; i++){
                    tr[i] = {
                      uuid: results[i].uuid.value,
                      fullName: results[i].fullName.value,
                      familyName: results[i].familyName.value,
                      tokens: [results[i].familyName.value, results[i].givenName.value],
                      group: groupKey
                    }
                    if ('mail' in results[i]){
                      tr[i].mail = results[i].mail.value;
                    }
                    if ('givenName' in results[i]){
                      tr[i].givenName = results[i].givenName.value;
                    }
                  }
                  return tr;
                }})(key),
              cache: false    //NOTE Sure about this?
            }
          });
        }
      }
      var datasets = [];
      var j=0;
      for (key in this.authorGroups) {

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
        }
      }
      var autocomplete = $input.typeahead({
        hint: false,
        highlight: false,
        minLength: 3
      }, datasets);

      var $ul = $('<ul id="' + field.id + '-editable" class="list-group editable" style="display:none"></ul>');
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

      //Add External Author Modal
      var $exAuthorsModal = $('#externalAuthorModal');
      if ($exAuthorsModal.length === 0) {
        var $exAuthorsModal = $('<div id="externalAuthorModal" class="modal fade" role="dialog"></div>');
        var $divmod = $('<div class="modal-dialog modal-lg"></div>');
        var $modcont = $('<div class="modal-content"></div>');
        $modcont.append($('<div class="modal-header">' +
          '<button type="button btn-md" class="close" data-dismiss="modal">&times;</button>' +
          '<h4 class="modal-title">Add External Author</h4>' +
          '</div>' +
          '<div class="modal-body">' +
          '<form id="abstractForm" class="form-horizontal" role="form">' +
          '<div class="form-group">' +
          '<div>' +
          '<label class="col-sm-2 control-label" for="externalFirstName">First Name:</label>' +
          '<div class="col-sm-4">' +
          '<input class="form-control input-sm" id="externalFirstName" type="text" />' +
          '</div>' +
          '</div>' +
          '<div>' +
          '<label class="col-sm-2 control-label" for="externalLastName">Last Name:</label>' +
          '<div class="col-sm-4">' +
          '<input class="form-control input-sm" id="externalLastName" type="text" />' +
          '</div>' +
          '</div>' +
          '</div>' +
          '<div class="form-group">' +
          '<label class="col-sm-2 control-label" for="externalAuthorMail">Author E-mail:</label>' +
          '<div class="col-sm-10">' +
          '<input class="form-control input-sm" id="externalAuthorMail" type="text" />' +
          '</div>' +
          '</div>' +
          '</form>' +
          '</div>'));
        var $modfooter = $('<div class="modal-footer"><button type="button" class="btn btn-default btn-md" data-dismiss="modal">Close</button></div>');
        var $submitButton = $('<button>', {
          text: 'Apply',
          id: 'exAuthorSubmit',
          type: 'button',
          class: 'btn btn-primary btn-md',
          click: (function() {

            var query = 'prefix foaf: <http://xmlns.com/foaf/0.1/>\n';
            query += 'INSERT{ \n';
            query += '?uuid rdf:type foaf:Person; \n';
            query +=    '<' + this.prefix + 'Person_Group> "External_Author"; \n';
            query +=    'foaf:familyName "'+ $('#externalLastName').val() +'"; \n';
            query +=    'foaf:givenName "'+ $('#externalFirstName').val() +'"; \n';
            query +=    'foaf:mbox "mailto:'+$('#externalAuthorMail').val()+'"; \n';
            query +=    '<'+ this.prefix + 'Person_UUID> ?uuid . \n';
            query += '}WHERE{\n';
            query +=    'SELECT ?uuid WHERE {BIND(UUID() as ?uuid)} \n';
            query += '}';

            this.loader.show();
            $.when(this.insertExternalAuthor(query)).always($.proxy(function(a){
              if(a.status === 200){
                this.loader.hide();
                $('#externalAuthorModal').modal('hide');
                $('#externalAuthorModal input').val('');
                var $alert = $('<div class="alert alert-success alert-dismissable fade in">'+
                  '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
                  '<strong>Success!</strong> New External Author was added.'+
                '</div>');
                this.element.prepend($alert);
              }else{
                this.loader.hide();
                $('#externalAuthorModal').modal('hide');
                $('#externalAuthorModal input').val('');
                var $alert = $('<div class="alert alert-danger alert-dismissable fade in">'+
                  '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
                  '<strong>Warning!</strong> New External Author addition Failed!'+
                '</div>');
                this.element.prepend($alert);
              }
            }, this));
          }).bind(this)
        });
        $exAuthorsModal.append($divmod);
        $divmod.append($modcont);

        $exAuthorsModal.on('shown.bs.modal', function(){
          $('#externalFirstName').focus();
        })

        $modfooter.append($submitButton);
        $modcont.append($modfooter);
      }

      $input.bind('typeahead:select keypress', (function (that){
          return function(ev, suggestion) {
          if (ev.type === 'keypress' && ev.which != 13) {
            return;
          }

          var valid = true;
          $(ev.type !== 'keypress' && '.' + field.id + '-contributor-name').each(function() {
            if ($(this).attr('data-uuid') === suggestion.uuid) {
              return valid = false;
            }
          });
          if (valid) {
            var $list = $('#' + field.id + '-editable');
            var $li;
            if (ev.type === 'typeahead:select') {
              var mail = '';
              if ('mail' in suggestion){
                mail = 'title="'+suggestion.mail+'"';
              }
              $li = $('<li class="list-group-item" ' + mail + '" draggable="false" style="float:left"></li>');
            }
            $list.append($li);


            if (ev.type === 'keypress') {
              $exAuthorsModal.modal();
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
              $li.html(author_group + '<span class="' + field.id + '-contributor-name'+
                ' contributor" data-uuid="'+suggestion.uuid+'" data-field="'+field.id+
                '" ' +mail + '>' + suggestion.fullName + '</span>');

              $('<i class="js-remove">✖</i>').appendTo($li);
              $list.show();
            }
          }
          $(this).typeahead('val', '');
        }
      })(this));

      return $group;
    },
    //Insert Literal Fields
    insertLiteralField: function(field, size, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $d = $('<div></div>').append($('<label for="' +
        field.id + '"class="col-sm-2 control-label">' + required + field.label + ':</label>'));
      var $d1 = $('<div class="col-sm-' + size + '"></div>');
      var $input = $('<input class="form-control input-sm press-field" '+
          'id="' + field.id + '" data-label="'+field.label+'" type="text"></input>');
      if(this.oldFields[field.id])
        $input.val(this.oldFields[field.id]);
      $d1.append($input);
      $d.append($d1);
      return $d;
    },
    //Insert Number Fields
    insertNumberField: function(field, size, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $d = $('<div></div>').append($('<label for="' +
        field.id + '"class="col-sm-2 control-label">' + required + field.label + ':</label>'));
      var $d1 = $('<div class="col-sm-' + size + '"></div>');
      var $input = $('<input class="form-control input-sm press-field" '+
          'id="' + field.id + '" type="number" data-label="'+field.label+'"></input>');
      if(this.oldFields[field.id])
        $input.val(this.oldFields[field.id]);
      $d1.append($input);
      $d.append($d1);
      return $d;
    },
    //Insert Upload File Field
    insertLocalField: function(field, size, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $d = $('<div></div>').append($('<label for="' +
        field.id + '"class="col-sm-2 control-label">' + required + 'Upload File:</label>'));
      var $d1 = $('<div class="col-sm-' + size + '"></div>');
      var $input = $('<input class="form-control input-sm press-field" '+
          'id="' + field.id + '" type="file" data-label="Upload File"></input>');
      if(this.oldFields[field.id])
        $input.val(this.oldFields[field.id]);
      $d1.append($input);
      $d.append($d1);
      return $d;
    },
    //Insert Project Field, using typeahead.js and sortable.js
    insertProjectField: function(field, size, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $group = $('<div id="' + field.id + '-bloodhound"></div>')

      var $label = $('<label class="col-sm-2 control-label" for="' + field.id + '-input">' + required + field.label + ':</label>');
      var $d = $('<div class="col-sm-10"></div>');
      var $input = $('<input id="' + field.id + '-input" class="typeahead '+
          'form-control input-sm press-field" type="text" data-label="'+field.label+'"/>');

      $d.append($input);

      $group.append($label);
      $group.append($d);
      var project_bloodhound = new Bloodhound({
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('projectID name'),
        remote: {
          url: this.dbURL,
          wildcard: '%QUERY',
          prepare: (function (prefix){
            return function(query, settings){

              var queries = query.split(' ');

              BDSquery = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n'+
                'prefix press: <' + prefix + '> \n' +
                'SELECT ?projectID ?name WHERE { \n' +
                '?name bds:search "'+queries+'*". \n'+
                '?name bds:matchAllTerms "true". \n'+
                '?projectID press:Project_Name ?name. \n'+
                '} ';

              settings.data = {
                query: BDSquery,
              }
              return settings;
            }
          })(this.prefix),
          transform: function(response){
            if (typeof response !== 'object') return [];
            var tr=[];
            var results = response.results.bindings;
            for (let i=0; i<results.length; i++){
              tr[i] = {
                projectID: results[i].projectID.value,
                name: results[i].name.value
              }
            }
            return tr;
          }
        }
      });

      var dataset = {
        name: 'projects',
        source: project_bloodhound,
        display: 'name'
      }
      $input.typeahead({
        hint: false,
        highlight: true,
        minLength: 3
      }, dataset);

      var $ul = $('<ul id="' + field.id + '-editable" class="list-group editable" style="display:none"></ul>');
      $d.append($ul);

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
        if (ev.type === 'keypress' && ev.which != 13) {
          return;
        }
        var $list = $('#' + field.id + '-editable');

        var $li = $('<li class="project-item list-group-item" draggable="false" style="float:left"></li>');
        $li.attr('id', suggestion.id);
        $li.attr('title', suggestion.name);
        $list.append($li);
        $li.text(suggestion.name);
        $('<i class="js-remove">✖</i>').appendTo($li);
        $list.show();
        $(this).typeahead('val', '');
      });

      return $group;
    },
    //Insert Tag field using typeahead.js and sortable.js
    insertTagField: function(field, size, isRequired = false){
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      $input = $('<input class="typeahead form-control input-sm press-field" '+
          'id="tag-input" data-label="Tags" type="text"/>');
      $ul = $('<ul id="tag-editable" class="list-group editable" style="display:none"></ul>');
      var $taggroup = $('<div id="tag-group" class="form-group"></div>');
      var $col_div = $('<div class="col-sm-10"></div>');
      $taggroup.append($('<label class="col-sm-2 control-label" for="tag-input">'+required+'Tags:</label>'));
      $taggroup.append($col_div);
      $col_div.append($input);
      $col_div.append($ul);

      var tagsBlood = new Bloodhound({
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        local: this.tags
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

      $input.bind('typeahead:select keypress', function(ev, suggestion) {
        var $list = $('#tag-editable');
        if (ev.type === 'keypress' && ev.which != 13) {
          return;
        }
        var valid = true;
        $('.tag-item').each(function() {
          if ($(this).attr('id') === suggestion) {
            return valid = false;
          }
        });
        if (valid) {
          var $li;
          if (ev.type === 'keypress'){
            suggestion = $(this).typeahead('val');
            $li = $('<li id="'+suggestion+'" class="tag-item list-group-item" draggable="false" style="float:left"></li>');
          }else{
            $li = $('<li id="'+suggestion+'" class="tag-item list-group-item" draggable="false" style="float:left"></li>');
          }
          $list.append($li);
          $li.html(suggestion);
          $('<i class="js-remove">&nbsp;✖</i>').appendTo($li);
          $list.show();
        }
        $(this).typeahead('val', '');
      });
      return $taggroup;
    },
    //Insert Date field using daterangepicker.js
    insertDate: function(field, size, isRequired = false){
        var required = '';
        if (isRequired){
          required = '<span style="color:red">*</span>';
        }
        var $d = $('<div></div>').append($('<label for="' +
          field.id + '"class="col-sm-2 control-label">' + required + field.label + ':</label>'));


        var $i = $('<input class="form-control input-sm press-field" id="' +
            field.id + '" type="text" value="" data-label="'+field.label+'" ></input>');
        $i.daterangepicker({
          singleDatePicker: true,
          autoApply: false,
          "locale": {
            format: "YYYY-MM-DD",
            cancelLabel: 'Clear'
          },
        });
        $i.on('cancel.daterangepicker', function(ev, picker) {
          $(this).val('');
        });

        $i.on('apply.daterangepicker', onApply = function(ev, picker){
          if($(this).attr('id').indexOf('Start') !== -1){
            var $end = $('#'+$(this).attr('id').replace('Start', 'End'));
            $end.daterangepicker({
              singleDatePicker: true,
              minDate: $(this).val(),
              autoApply: false,
              "locale": {
                format: "YYYY-MM-DD",
                cancelLabel: 'Clear'
              },
            });
            $end.on('apply.daterangepicker', onApply);
            $end.on('cancel.daterangepicker', function(ev, picker) {
              $(this).val('');
            });
          }else if($(this).attr('id').indexOf('End') !== -1){
            var $start = $('#'+$(this).attr('id').replace('End', 'Start'));
            $start.daterangepicker({
              singleDatePicker: true,
              maxDate: $(this).val(),
              autoApply: false,
              "locale": {
                format: "YYYY-MM-DD",
                cancelLabel: 'Clear'
              },
            });
            $start.on('apply.daterangepicker', onApply);
            $start.on('cancel.daterangepicker', function(ev, picker) {
              $(this).val('');
            });
          }
        });
        $i.val('');
        var $d1 = $('<div class="col-sm-' + size + '"></div>');
        $d1.append($i);
        var $clear = $('<span class="searchclear glyphicon glyphicon-remove-circle"></span>');
        $clear.on('click', function(){
          $i.val('');
        })
        if(this.oldFields[field.id]){
          $i.data('daterangepicker').setStartDate(this.oldFields[field.id]);
          $i.data('daterangepicker').setEndDate(this.oldFields[field.id]);
        }
        $d1.append($clear);
        $d.append($d1);
        return $d;
    },
    //Insert Long Literal (textarea) field
    insertLongField: function(field, size, isRequired = false) {
      var required = '';
      if (isRequired){
        required = '<span style="color:red">*</span>';
      }
      var $d = $('<div></div>').append($('<label for="' +
        field.id + '"class="col-sm-2 control-label">' + required + field.label + ':</label>'));
      var $d1 = $('<div class="col-sm-' + size + '"></div>');
      var $input = $('<textarea rows="1" class="form-control input-sm" id="' + field.id + '" style="resize:none"></textarea>');
      if(this.oldFields[field.id])
        $input.val(this.oldFields[field.id]);
      $input.focus(function() {
        $(this).animate({
          height: '+=120'
        }, 'slow');
      }).blur(function() {
        $(this).animate({
          height: '-=120'
        }, 'slow');
      });
      $d1.append($input);
      $d.append($d1);
      return $d;
    },
    //Insert All fields based on ontology data property range
    insertFields: function(fields, requiredFields) {

      function printFields(field, depth, fieldGroup) {

        for (let i = 0; i < field.length; i++) {
          var required = false;
          var size = 4;
          if (depth === 1) {
            fieldGroup = $('<div class="form-group"></div>');
            size = 10;
          }

          if (!Array.isArray(field[i])) {
            if ($.inArray(field[i], requiredFields) !== -1)
              required = true;
            var fieldDiv;
            if (field[i] in this.personFields) {
              fieldDiv = this.insertPersonField(this.fields[field[i]], required);
            } else if (field[i].indexOf('Abstract') !== -1) {
              fieldDiv = this.insertLongField(this.fields[field[i]], size, required);
            }else if(field[i] === 'Tag'){
              fieldDiv = this.insertTagField(field[i], size, required);
            } else if (field[i] !== 'project' && field[i].indexOf('Date') === -1) {
              switch (this.fields[field[i]].range) {
                case 'http://xmlns.com/foaf/0.1/Person':
                  fieldDiv = this.insertPersonField(this.fields[field[i]], required);
                  break;
                case 'http://www.w3.org/2000/01/rdf-schema#Literal':
                  if (this.fields[field[i]].id === 'Local_Link') {
                    fieldDiv = this.insertLocalField(this.fields[field[i]], size, required);
                  } else {
                    fieldDiv = this.insertLiteralField(this.fields[field[i]], size, required);
                  }
                  break;
                case 'http://www.w3.org/2001/XMLSchema#int':
                  fieldDiv = this.insertNumberField(this.fields[field[i]], size, required);
                  break;
                default:
                  console.warn(this.fields[field[i]].range);
              }
            } else if (field[i] === 'project') {
              fieldDiv = this.insertProjectField({
                id: 'project',
                label: 'Project'
              }, size, required);
            } else if (field[i].indexOf('Date') !== -1) {
              fieldDiv = this.insertDate(this.fields[field[i]], size, required);
            }
            var $group = (depth === 1) ? fieldGroup : 4;
            this.fieldElement.append(fieldGroup.append(fieldDiv));
          } else {
            printFields.call(this, field[i], depth + 1, fieldGroup);
          }

        }
      }
      printFields.call(this, fields, 1, $('<div class="form-group"></div>'));
    },
    //Clear Form action
    clearForm: function() {
      $('.has-error').removeClass('has-error');
      $('[data-original-title]').popover('destroy');
      $('#form-fields input').val('');
      $('#form-fields textarea').val('');
      $('.editable').not('#lab-editable').empty()
      $('.editable').not('#lab-editable').hide()
      this.oldFields = {};
    },
    //Validate form values for requirements
    validateForm: function() {
      $('.has-error').removeClass('has-error');
      $('[data-original-title]').popover('destroy');

      var correct = true;
      if (!$('#lab-editable').children().length) {

        $('#lab-group').addClass('has-error');
        correct = false;
        console.error('Lab validation Error!');
      }

      if (!this.cat.val()) {
        $('#category-group').addClass('has-error');
        console.error('Cat validation Error!');
        return false;
      }
      if (!this.subcat.val()) {
        $('#subcategory-group').addClass('has-error');
        console.error('Subcat validation Error!');
        return false;
      }

      var required;
      var $selected = $(':selected', this.subcat);
      if($selected.parent().prop('tagName') === 'OPTGROUP'){
        required = this.requiredFields[this.cat.val()][$selected.parent().attr('id')][this.subcat.val()];
      }else{
        required = this.requiredFields[this.cat.val()][this.subcat.val()];
      }

      //Validate if current user is contributor or if Power User
      var power_user = false;
      if ($.inArray('Power User', this.current_user.roles) >= 0) {
        power_user = true;
      }
      var current_user_added = false
      var contributors = ['author', 'bookEditor', 'chapterAuthor', 'supervisor'];

      $('.contributor').each($.proxy(function(index, element) {
        if ($(element).attr('data-mail') === this.current_user.mail) {
          current_user_added = true;
          return false
        }
      }, this));

      if (!power_user && !current_user_added) {
        for (var i = 0; i < contributors.length; i++) {
          $('#' + contributors[i] + '-bloodhound').popover({
            'placement': 'top',
            'content': 'You have to include your name as a contributor!'
          }).popover('show');
          $('#' + contributors[i] + '-bloodhound').addClass('has-error');
          correct = false;
          console.error('Current User Permission validation Error!');
        }
      }

      for (var i = 0; i < required.length; i++) {
        switch (required[i]) {
          case 'author':
          case 'bookEditor':
          case 'chapterAuthor':
          case 'supervisor':
            if (!$('#' + required[i] + '-editable').children().length) {
              $('#' + required[i] + '-bloodhound').addClass('has-error');
              correct = false;
              console.error('Person validation Error!');
            }
            break;
          case 'Local_Link':
            if (!this.editMode){
              if (!$('#' + required[i]).val()) {
                $('#' + required[i]).parent().parent().addClass('has-error');
                correct = false;
                console.error('File Upload validation Error!');
              }
            }
            break;
          default:
            if (!$('#' + required[i]).val()) {
              $('#' + required[i]).parent().parent().addClass('has-error');
              correct = false;
              console.error('Default validation Error:' + required[i]);
            }
        }
      }
      if ($('#project-input').val() !== '' && $.inArray($('#project-input').val(), project_name) === -1) {
        $('#project-bloodhound').addClass('has-error');
        console.error('Project validation Error!');
        correct = false;
      }
      return correct;
    },
    submitPublication: function(del=false) {
      if (!del){
        if (!this.validateForm.call(this)){
          console.error('Validation Error!');
          return;
        }
      }
      function constructQuery(response, del){
        prefix = this.prefix;
        var query = "prefix foaf: <http://xmlns.com/foaf/0.1/> \n";

        if(this.editMode){
            query += 'DELETE { \n';
            query += '?pub ?p ?o. \n';
            query += '?pub ?con ?conList. \n';
            query += '?conList ?conListP ?conListO. \n';
            query += '?conListO ?slotP ?slotO. \n';
            query += '}\n';
            query += 'WHERE{ \n';
            query += '?pub <'+this.prefix+'Publication_UUID> "'+this.editPublication.uuid+'". \n';
            query += '?pub ?p ?o. \n';
            query += '?con rdfs:subPropertyOf* <'+this.prefix+'contributor>. \n';
            query += 'OPTIONAL{?pub ?con ?conList. \n';
            query += 'OPTIONAL{?conList ?conListP ?conListO. \n';
            query += 'OPTIONAL{?conListO ?slotP ?slotO.}}} \n';
            query += '}';
            if (!del)
              query += '; \n';
        }
        if (!del){
          query += "INSERT DATA { \n";
          query += "<urn:uuid:"+response.uuid+"> rdf:type <"+this.prefix+this.subcat.val()+">; \n";
          query += '<'+prefix+'Publication_UUID> "urn:uuid:'+response.uuid+'"; \n';
          query += '<'+prefix+'Publication_URL> "'+response.path+'"; \n';


          $('#lab-editable li').each(function(){
            query = query+"<" + prefix + "belongsTo> <"+prefix+$(this).attr('id')+">; \n";
          })

          function traverseFields(field){
            var prefix = this.prefix;
            for (let i = 0; i < field.length; i++) {
              if (!Array.isArray(field[i])) {
                if(field[i] in this.personFields){
                  query = query +'<'+ this.prefix+ field[i]+ '> [ rdf:type <'+ this.prefix +'List>; \n';
                  var length = 0;
                  $('.'+field[i]+'-contributor-name').each(function(){
                    query += '<'+ prefix +'slot> [\n'+
                            '<'+ prefix +'list_item> <'+$(this).attr('data-uuid')+'>; \n'+
                            '<'+ prefix +'list_index> '+ ++length +'; \n'+
                            ']; \n';
                  });
                  query += '<'+ prefix +'list_length> '+length+']; \n';
                }else if(field[i] === 'project'){
                  $('.project-item').each(function(){
                    query = query + '<'+ prefix+ 'appearsIn> <'+prefix+$(this).attr('id') +'>; \n' ;
                  });
                }else if(field[i] === 'Local_Link' && $('#'+field[i]).val().trim() !== ''
                          && response.file_url !== ''){
                  query+= '<'+this.prefix+'Local_Link> "'+response.file_url+'"; \n';
                }else if(field[i] === 'Tag'){
                  $('.tag-item').each(function(){
                    query = query + '<' + prefix + 'Tag> "' + $(this).attr('id') +'"; \n';
                  });
                }else if($('#'+field[i]).val().trim() !== ''){
                  query = query + '<' + prefix + field[i] +'> "' + $('#'+field[i]).val().escapeSpecialChars() + '"; \n';
                }

              } else {
                traverseFields.call(this, field[i]);
              }
            }
          }

          var fields;
          if($(':selected', this.subcat).parent().prop('tagName') === 'OPTGROUP'){
            fields = this.JSONfields[this.cat.val()][$(':selected', this.subcat).parent().attr('id')][this.subcat.val()];
          }else{
            fields = this.JSONfields[this.cat.val()][this.subcat.val()];
          }
          traverseFields(fields);

          query += '.}\n';
        }
        return query;
      }

      function ajax(options) {
        var settings = {
          method: 'POST',
          data: null,
          done: function() {},
          fail: function() {},
          complete: function() {}
        };

        if (options)
          for (option in options) settings[option] = options[option];

        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
          if (xhttp.readyState == 4) {
            if (xhttp.status == 200) {
              settings.done(xhttp.responseText);
            } else {
              settings.fail(xhttp.responseText);
            };
            settings.complete(xhttp.responseText);
          };
        };
        xhttp.open(settings.method, settings.url, true);
        xhttp.send(settings.data);
      };

      function beginUpload(del) {
        // console.log($('#'+this.titleFields[$('#category').val()][$('#subcategory').val()]).val());
        var pkg = new FormData();
        if (!del){
          var $body = $('<div></div>');
          var $contributors = $('<div class="col-sm-12"></div>');
          var $summary = $('<div></div>');
          var contributors = {};
          $('.contributor').each(function() {
            if(!Array.isArray(contributors[$(this).attr('data-field')]))
                contributors[$(this).attr('data-field')] = [];
            contributors[$(this).attr('data-field')].push($(this));
          });
          var length = Object.keys(contributors).length;
          var j = 0;
          for (key in contributors){
            var $concat = $('<div class="col-sm-3"><h3>'+this.fields[key].label+'</h3></div>');
            for(let i=0; i< contributors[key].length; i++){
              $concat.append(contributors[key][i].text()+'<br/>');
              $summary.append(contributors[key][i].text());
              if(j !== length-1 || i !== contributors[key].length -1){
                $summary.append(', ');
              }
            }
            $contributors.append($concat);
            j++;
          }
          $body.append($contributors);
          // console.log(this.fields);
          fields = this.fields;
          var $abstracts = $('<div class="col-sm-12"></div>');
          var abstractExists = false;
          $('[id$=Abstract]').each(function(){
            if($(this).val().trim() !== ''){
              abstractExists = true;
              var abstract = $('<div class="col-sm-12"><h3>'+fields[$(this).attr('id')].label+'</h3></div>');
              abstract.append('<p>'+$(this).val().trim()+'</p>');
              $abstracts.append(abstract);
              if($(this).attr('id') === 'English_Abstract'){
                $summary.append('<br/>');
                var abstractSummary = $(this).val().trim().split(' ', 40);
                $summary.append('<br/>'+ abstractSummary.join(' ') +'...');
              }
            }
          });
          if(abstractExists)
            $body.append($abstracts);

          var $restOfFields = $('<div class="col-xs-12"><p>&nbsp;</p></div>');
          var fieldLabel = $('<table class="table table-hover"></table>')
          $('input.press-field:not(.typeahead, [id$=Abstract], #External_Link, #English_Title, #Local_Link)').each((function(that){
            return function(){
              if ($(this).val() !== ''){
                fieldLabel.append('<tr><td>'+$(this).attr('data-label')+'</td><td>'+$(this).val()+'</td>');
                // $restOfFields.append('<h4>'+$(this).attr('data-label')+'</h4>');
                // $restOfFields.append('<p>'+$(this).val()+'</p><br/>');
              }
            }
          })(this));
          $restOfFields.append(fieldLabel);
          var div = $('<div class="col-xs-12"></div>');
          div.append($restOfFields);
          $body.append(div);


          if($('#Local_Link', this.element)[0].files[0]){
            pkg.append('myfile', $('#Local_Link', this.element)[0].files[0]);
          }

          pkg.append('title', $('#'+this.titleFields[$('#category').val()][$('#subcategory').val()]).val());
          pkg.append('body', $body.html());
          pkg.append('summary', $summary.html());
          pkg.append('delete', false);
        }else{
          pkg.append('delete', true);
        }

        var ajax_url = '../ajax/add_publication_page';  //TODO Remove Hardcoded URL
        if(this.editMode){
          var uuid = this.editPublication.uuid
          if(this.editPublication.uuid.startsWith('urn:uuid:')){
            uuid = uuid.substring(9);
          }
          pkg.append('uuid', uuid);
          ajax_url = '../ajax/edit_publication_page';
        }

        ajax({
          url: ajax_url,
          data: pkg,
          done: (function(res) {
            // console.log(res);
            response = JSON.parse(res);
            // console.log(response);
            var updateQuery = constructQuery.call(this, response, del);
            var href = '../publication/search-pub';
            if (!del){
              href = '/' + response.path;
            }
            $.ajax({
              dataType: 'html',
              method: "POST",
              url: this.dbURL,
              data: {
                update: updateQuery
              }
            })
            .done(function(response){
              window.location.href = href;
            })
            .fail(function(response){
              console.error(response);
            });
          }).bind(this)
        });
      };
      this.loader.show();
      beginUpload.call(this, del);
    },
    insertExternalAuthor: function(updateQuery) {
      return $.ajax({
        dataType: 'json',
        method: "POST",
        url: this.dbURL,
        data: {
          update: updateQuery
        }
      })
      .done(function(response){
        // console.log(response);
      })
      .fail(function(response){
        console.error(response);
      });
    },
    //Insert form Buttons
    insertButtons: function() {
      var $doiButton = $('<button>', {
        text: 'Add By DOI',
        id: 'doiButon',
        type: 'button',
        class: 'btn btn-default btn-md',
        click: (function(){
          this.doiModal.modal();
        }).bind(this)
      });

      if (!this.editMode){
        this.leftButtonArea.append($doiButton);
        this.leftButtonArea.append('&nbsp;&nbsp;');
      }

      var $clearButton = $('<button>', {
        text: 'Clear',
        id: 'clearButton',
        type: 'button',
        class: 'btn btn-default btn-md',
        click: this.clearForm
      });

      this.leftButtonArea.append($clearButton);
      this.leftButtonArea.append('&nbsp;&nbsp;');

      var submitText = 'Submit';
      if (this.editMode){
        var $deleteModal = $('<div id="deleteModal" class="modal fade" role="dialog"></div>');
        var $divmod = $('<div class="modal-dialog modal-lg"></div>');
        var $modcont = $('<div class="modal-content"></div>');
        $modcont.append($('<div class="modal-header">' +
          '<button type="button btn-md" class="close" data-dismiss="modal">&times;</button>' +
          '<h4 class="modal-title">Delete Publication</h4>' +
          '</div>' +
          '<div class="modal-body">' +
          '<p>Are you sure you want to delete this Publication?</p>'+
          '</div>'));
        var $modfooter = $('<div class="modal-footer"><button type="button" class="btn btn-default btn-md" data-dismiss="modal">Cancel</button></div>');
        $modcont.append($modfooter);
        $divmod.append($modcont);
        $deleteModal.append($divmod);
        var $modalDeleteButton = $('<button>', {
            html: '<i class="fa fa-trash" '+
                      'aria-hidden="true"></i>&nbsp;Delete Publication',
            id: 'modalDeleteButton',
            type: 'button',
            class: 'btn btn-default btn-md',
            click: (function(){
              this.submitPublication(true);
            }).bind(this)
          });
        $modfooter.append($modalDeleteButton);
        this.deleteModal = $deleteModal;
        this.element.append($deleteModal);
        var $deleteButton = $('<button>', {
          html: '<i class="fa fa-trash" '+
                    'aria-hidden="true"></i>&nbsp;Delete Publication',
          id: 'deleteButton',
          type: 'button',
          class: 'btn btn-default btn-md',
          click: (function(){
            this.deleteModal.modal();
          }).bind(this)
        });

        this.leftButtonArea.append($deleteButton);
        submitText = 'Submit Changes';
      }
      var $submitButton = $('<button>', {
        text: submitText,
        id: 'submitButton',
        type: 'button',
        style: 'float:right',
        class: 'btn btn-primary btn-md',
        click: (function(){
          this.submitPublication(false);
        }).bind(this)
      });

      this.rightButtonArea.append($submitButton);
    },
    //Fill fields by DOI Import
    fillFieldsByDOI: function(response){
      var item = response.message;
      //Category Selection
      var categories = this.doiCategoriesToPRESS[item.type];

      //console.log(item);

      if (categories){
        this.cat.val(categories[0]);
        this.cat.change();
        this.subcat.val(categories[1]);
        this.subcat.change();
      }else{
        this.cat.val('Other');        //TODO Fix Hardcoded Categories
        this.cat.change();
        this.subcat.val('Miscellaneous');
        this.subcat.change();
      }


      //Author Selection
      var contributorField = this.contributorOrder[this.subcat.val()][0];
      var $list = $('#'+contributorField+'-editable');

      var authors = item.author;
      var i;

      var $input = $('#'+contributorField+'-input');
      authorGroups = [];
      for (var key in this.authorGroups){
        authorGroups.push(key);
      }
      authorGroups.sort(function (that) {
        return function(a, b){
          return that.authorGroups[a].priority - that.authorGroups[b].priority;
        };
      }(this));
      var bloodhounds = this.bloodhounds;
      var authorResponse = [];
      var authorResponseCount = 0;
      function getEachAuthor(query, j){
        if (j >= authorGroups.length){
          authorResponseCount++;
          return;
        }
        function fsync(datums){
          return;
        }
        function fasync(datums){
          if(datums.length === 0){
            getEachAuthor(query, j+1);
          }else{
            authorResponseCount++;
            authorResponse.push(datums[0]);
          }
        }
        bloodhounds[authorGroups[j]].search(query, fsync, fasync);
      }

      var query = 'prefix bds: <http://www.bigdata.com/rdf/search#> \n'+
                'prefix press: <'+this.prefix+'> \n';
      query += 'SELECT * WHERE { \n';
      // var optionals = '';
      for (i=0; i<authors.length; i++){     //TODO IS it efficient? (rateLimitWait: 0)
        query += '{\n';
        query += '?oGivenName'+i+' bds:search "'+authors[i].given+ '*". \n';
        query += '?oGivenName'+i+' bds:relevance ?score'+i+'. \n';
        query += '?oGivenName'+i+' bds:maxRank "20". \n';
        query += '?uuid'+i+' foaf:givenName ?oGivenName'+i+'. \n';
        query += '?oFamilyName'+i+' bds:search "'+authors[i].family+ '*". \n';
        query += '?uuid'+i+' foaf:familyName ?oFamilyName'+i+'. \n';
        query += '?uuid'+i+' press:Person_Group ?group'+i+'. \n';
        query += 'BIND ("'+i+'" AS ?index)\n';
        query += 'BIND (CONCAT(?oGivenName'+i+', \" \", ?oFamilyName'+i+') AS ?fullName'+i+'). \n';
        query += 'OPTIONAL{?uuid'+i+' foaf:mbox ?mbox'+i+'}. \n';
        query += '}';
        if (i !== authors.length -1){
          query += 'UNION\n';
        }
        // getEachAuthor(authors[i].given +' '+authors[i].family, 0);
      }
      // query += optionals;
      query += '}';
      //Find DOI authors in Database
      $.when(this.getQuery(query)).done((function (that){
        return function(response){
          // console.log(response);
          var results = response.results.bindings;
          var response_authors = [];
          for (i=0; i<results.length; i++){
            var current_author = results[i];
            var index = parseInt(current_author.index.value);
            if (!response_authors[index]){
              response_authors[index] = {External_Author: [], FORTH_ICS_Author: []};
            }
            response_authors[index][current_author['group'+current_author.index.value].value].push({});

            for (key in current_author){
              response_authors[index][current_author['group'+current_author.index.value].value][response_authors[index][current_author['group'+current_author.index.value].value].length-1][key.replace(''+index, '')] = current_author[key].value;
            }
          }

          var added = false;
          for (i=0; i<response_authors.length; i++){
            current_author = response_authors[i];
            for (var j=0; current_author && j<authorGroups.length; j++){
              if (current_author[authorGroups[j]].length >0){
                current_author[authorGroups[j]].sort(function(a,b){
                  return a.score - b.score;
                });
                var $li = $('<li class="list-group-item" draggable="false"'+
                  'style="float:left;"></li>');
                var group = (that.authorGroups[current_author[authorGroups[j]][0].group].span) ? that.authorGroups[current_author[authorGroups[j]][0].group].span : '';
                $li.append(group);
                var $span = $('<span class="author-contributor-name contributor" '+
                  'data-uuid="'+current_author[authorGroups[j]][0].uuid+'" data-field="author">'+current_author[authorGroups[j]][0].fullName+'</span>');
                if (current_author[authorGroups[j]][0].mail){
                  $li.attr('title', current_author[authorGroups[j]][0].mail);
                  $span.attr('data-mail', current_author[authorGroups[j]][0].mail);
                }
                $li.append($span);
                $li.append($('<i class="js-remove">&nbsp;✖</i>'));
                $list.append($li);
                added = true;
                authors[parseInt(current_author[authorGroups[j]][0].index)].added = true;
                break;
              }
            }
          }

          if (added){
            $list.show();
            var $alert = $('<div class="alert alert-info alert-dismissable fade in">'+
              '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
              '<strong>Authors from DOI Added!</strong> Please make sure the author group is correct and the author has the correct name.'+
            '</div>');
            that.element.prepend($alert);
          }


          var authorList = '<ul>';
          var missing = false;
          for (i=0; i<authors.length; i++){
            if(!authors[i].added){
              authorList += '<li>'+authors[i].given+' '+authors[i].family+'</li>';
              missing = true;
            }
          }
          authorList += '</ul>';
          //Show authors that where not found
          if (missing){
            var $modal = $('<div id="doiMissingAuthors" class="modal fade" role="dialog">'+
                            '<div class="modal-dialog">'+
                    '<!-- Modal content-->'+
                    '<div class="modal-content">'+
                      '<div class="modal-header">'+
                        '<button type="button btn-md" class="close" data-dismiss="modal">&times;</button>'+
                        '<h4 class="modal-title">Missing Authors</h4>'+
                      '</div>'+
                      '<div class="modal-body">'+
                        '<div class="form-horizontal" role="form">'+
                          '<div class="form-group">'+
                            '<div class="col-sm-12">'+
                              '<p>The following authors were not found in our Database. '+
                              'Please search the authors manualy, or add them in the Database'+
                              authorList+
                            '</p></div>'+
                          '</div>'+
                        '</div>'+
                      '</div>'+
                      '<div class="modal-footer">'+
                        '<button type="button" class="btn btn-default btn-md" data-dismiss="modal">Close</button>'+
                      '</div>'+
                    '</div>'+
                  '</div>'+
                '</div>');
            that.element.append($modal);
            $modal.modal();
          }
        }
      })(this));

      //Title Field
      var i;
      var titles = item.title;
      var title = titles[0];
      for (i=1; i<titles.length; i++){
        title = title + '-' + titles[i];
      }

      $('#'+this.titleFields[categories[0]][categories[1]]).val(title);

      //Year Field
      $('#Year').val(item.issued['date-parts'][0][0]);

      //Event Fields
      if(item.event){
        $('#Conference_Title').val(item.event.name);
        $('#Conference_Location').val(item.event.location);
        var start = item.event.start['date-parts'][0];
        start = start[0]+'-'+start[1]+'-'+start[2]
        var end = item.event.end['date-parts'][0];
        end = end[0]+'-'+end[1]+'-'+end[2];
        $('#Conference_Date_Start').data('daterangepicker').setStartDate(start);
        $('#Conference_Date_Start').data('daterangepicker').setEndDate(start);
        $('#Conference_Date_End').data('daterangepicker').setStartDate(end);
        $('#Conference_Date_End').data('daterangepicker').setEndDate(end);
      }

      //Journal Title
      if(item.type.includes('journal')){
        $('#Journal_Title').val(item['container-title'][0]);
      }

      //URL
      var jqxhr = $.ajax("https://doi.org/api/handles/"+item['DOI'])
        .done(function(data){
          // $('#external').val()
          for(var i=0; i<data.values.length; i++){
            if(data.values[i].type === "URL"){
              $('#External_Link').val(data.values[i].data.value);
            }
          }
        })
        .fail(function (data){
          alert(data);
        });

      //Rest of fields depending to doiTypesToPRESS dictionary
      $.each(this.doiFieldsToPRESS, function(key, value){
        $('#'+value).val(item[key]);
      })
    },
    //Get DOI Response
    getDOI: function(){
      var doi = document.getElementById('doi-input').value;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://api.crossref.org/works/'+doi);
      xhr.onload = (function() {
        if (xhr.readyState === 4 && xhr.status === 200){
          var response = JSON.parse(xhr.responseText);
          this.fillFieldsByDOI(response);
          console.log(response);
        }else if (xhr.status !== 200){
          alert('Request Failed. Returned status of ' + xhr.status);
          console.error(xhr.responseText);
        }
      }).bind(this);
      xhr.send();
    },
    //Modal for DOI Import
    createDOImodal(){
      var $modal = $('<div id="doiModal" class="modal fade" role="dialog">'+
                      '<div class="modal-dialog">'+
              '<!-- Modal content-->'+
              '<div class="modal-content">'+
                '<div class="modal-header">'+
                  '<button type="button btn-md" class="close" data-dismiss="modal">&times;</button>'+
                  '<h4 class="modal-title">Add Publication By DOI</h4>'+
                '</div>'+
                '<div class="modal-body">'+
                  '<div class="form-horizontal" role="form">'+
                    '<div class="form-group">'+
                      '<label class="col-sm-2 control-label" for="doi-input">DOI:</label>'+
                      '<div class="col-sm-10">'+
                        '<input class="form-control input-sm" id="doi-input" type="text" />'+
                      '</div>'+
                    '</div>'+
                  '</div>'+
                '</div>'+
                '<div class="modal-footer">'+
                  '<button type="button" class="btn btn-default btn-md" data-dismiss="modal">Close</button>'+
                  '<button id="getDOIbutton" type="button" class="btn btn-default btn-md" data-dismiss="modal">Apply</button>'+
                '</div>'+
              '</div>'+
            '</div>'+
          '</div>');
      $modal.find('#getDOIbutton').on('click', (this.getDOI).bind(this));
      $modal.find('#doi-input').on('keypress', (function(that){
        return function(e){
          if (e.keyCode == 13){
            $('#doiModal', that.element).modal('toggle');
            that.getDOI();
          }
        }
      })(this));
      return $modal;
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
  };

  $.fn.press = function(options, callback) {
    this.each(function() {
      var el = $(this);
      if (el.data('press'))
        el.data('press').remove();
      el.data('press', new PRESS(el, options, callback));
    });
    return this;
  };

  return PRESS;
}));
