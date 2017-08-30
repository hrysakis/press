# PRESS
### Publication REpository Semantic System

Publication management systems can be instrumental in disseminating research results across academia and industry, by providing facilities for uploading, editing and searching for publications. Usually, these systems can be used by individuals to assist them in their research or by organizations to help them classify and promote their publication items.

**PRESS** is an open-source publication system that exploits semantic technologies in order to cover the needs of both individuals and organizations. Thus, it supports fast data entry, advanced query capabilities and integration with other systems or datasets.

## Requirements

The minimum requirements of PRESS include:

[Drupal Typical Requirements](https://www.drupal.org/docs/7/system-requirements)

Blazegraph Typical Requirements
* 4GB RAM
* 1GB Disk Size
* Java 1.8


The current demo is running under the following specifications:

* Ubuntu 16.04.2 LTS
* 64GB ram
* 185GB HD
* Apache/2.4.18 (Ubuntu)
* mysql  Version 14.14 Distrib 5.7.18
* PHP 7.0.15-0ubuntu0.16.04.4 (cli) (NTS)
* openjdk Version 1.8.0_131
* Blazegraph 2.1.4 jetty server 9.2.3.v20140905

## Installation

The following installation will work with the ontology provided in this repository, without any modifications.

#### Module Installation

* Install [Blazegraph](https://wiki.blazegraph.com/wiki/index.php/Installation_guide)
  * Load the ontology provided
* Install [Drupal 7](https://www.drupal.org/docs/7/install)
* Install the following modules
  * [jQuery Update](https://www.drupal.org/project/jquery_update)
    * Enable for jQuery 1.10
  * [Bootstrap](https://www.drupal.org/project/bootstrap)
  * [Entity API](https://www.drupal.org/project/entity)
  * [Libraries API](https://www.drupal.org/project/libraries)
  * [Universally Unique IDentifier](https://www.drupal.org/project/uuid)
  * [Pathauto](https://www.drupal.org/project/pathauto)
* Copy Publication Module Files in folder "sites/all/modules/"
* Copy Library files in folder "sites/all/libraries/"
* Enable Publication Module
  * In case not all menus appear, please clear all caches from "[yourwebsite]/admin/config/development/performance"

#### Module Configuration

* Go at "[yourwebsite]/admin/config/publications/publication_mod"
  * Add Blazegraph REST API URL
  * Add the Ontology Prefix
  
  
  ## Online Demo
  
  You can see a live demo of PRESS by clicking [here](http://www.ics.forth.gr/isl/PressDemo/)
