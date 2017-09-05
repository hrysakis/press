# PRESS
### Publication REpository Semantic System

Publication management systems can be instrumental in disseminating research results across academia and industry, by providing facilities for uploading, editing and searching for publications. Usually, these systems can be used by individuals to assist them in their research or by organizations to help them classify and promote their publication items.

**PRESS** is an open-source publication system that exploits semantic technologies in order to cover the needs of both individuals and organizations. Thus, it supports fast data entry, advanced query capabilities and integration with other systems or datasets.

## Online Demo

You can see a live demo deployment of PRESS by clicking [here](http://www.ics.forth.gr/isl/PressDemo/).

## Requirements

The minimum requirements of PRESS include:

[Drupal Typical Requirements](https://www.drupal.org/docs/7/system-requirements)

Blazegraph Typical Requirements
* 4GB RAM
* 1GB Disk Size
* Java 1.8


The online demo is running under the following specifications:

* Ubuntu 16.04.2 LTS
* 64GB ram
* 185GB HD
* Apache/2.4.18 (Ubuntu)
* mysql  Version 14.14 Distrib 5.7.18
* PHP 7.0.15-0ubuntu0.16.04.4 (cli) (NTS)
* openjdk Version 1.8.0_131
* Blazegraph 2.1.4 jetty server 9.2.3.v20140905

## Installation

The following installation works with the ontology provided in this repository, without any modifications.

#### Module Installation

* Run Blazegraph using our CORS enabled edition (double click on blazegraph-cors-enabled.jar file). This Edition is bundled with jetty-servlets.jar and has CORS enabled
  * Enable Text Index for your Blazegraph Namespace through [Blazegraph GUI](http://localhost:9999/blazegraph/#namespaces)
  * Load the ontology provided through [Blazegraph GUI](http://localhost:9999/blazegraph/#update)
* Install [Drupal 7](https://www.drupal.org/docs/7/install)
* Install and enable the following modules
  * [jQuery Update](https://www.drupal.org/project/jquery_update)
    * Enable for jQuery 1.10
  * [Entity API](https://www.drupal.org/project/entity)
  * [Libraries](https://www.drupal.org/project/libraries)
  * [Universally Unique IDentifier](https://www.drupal.org/project/uuid)
  * [Pathauto](https://www.drupal.org/project/pathauto)
  * [Token](https://www.drupal.org/project/token)
* Install and enable [Bootstrap 7.x. Theme](https://www.drupal.org/project/bootstrap). We have set to Yeti Theme, but you can   choose a different style.
* Copy Drupal Module contents folder (publication_mod) in folder "sites/all/modules/"
* Copy Library files (pmslib folder, pmslib.libraries.info) in folder "sites/all/libraries/"
* Enable Publication Module
* In case not all menus appear, please clear all caches from "[yourwebsite]/admin/config/development/performance"

#### Module Configuration

* When you enable for the first time the PRESS Publication Module, it adds three fields for the user account and one user role called "Power User"
  * You have to be a Power User to add a Publication without being a contributor. The module assigns automatically the admin as Power User
  * The three fields added to users are "First Name", "Last Name" and "Laboratory". The first two are text type and the third is a selection of enumerated values that the admin can create. In order to add Laboratory values you go at "[yourwebsite]/admin/config/people/accounts/fields/field_laboratory" and add your desired values.
  * You will also have to fill the above fields for your account in order to use the module.
* Go at "[yourwebsite]/admin/config/publications/publication_mod"
  * Add Blazegraph REST API URL
  * Add the Ontology Prefix


# Copyright
Ioannis Chrysakis, Emmanouil Dermitzakis, Giorgos Flouris, Theodore Patkos and Dimitris Plexousakis.
[Foundation for Research and Technology Hellas, Institute of Computer Science](http://www.ics.forth.gr/).
Copyright 2017, FORTH-ICS, All Rights Reserved.

# Licence
Open source under [MIT-License](https://github.com/isl/press/blob/master/MIT-License.pdf).

# Publications
Ioannis Chrysakis, Emmanouil Dermitzakis, Giorgos Flouris, Theodore Patkos and Dimitris Plexousakis: PRESS: A Publication REpository Semantic System. (accepted at the Posters and Demo Session of the [13rd International Conference on Semantics System , Semantics 2017](https://2017.semantics.cc/)).

# Contact
Emmanouil Dermitzakis (dermitz@ics.forth.gr, dermitz@csd.uoc.gr),
Ioannis Chrysakis (hrysakis@ics.forth.gr)
