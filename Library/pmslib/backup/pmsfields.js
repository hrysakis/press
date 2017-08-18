//Color identification for each category
var categoryColor = {
	"Book": '#52c329',
	"Conference_Workshop": '#ff972a',
	"Journal": '#982db3',
	"Other": '#727272',
};


//Fields for each category
var JSONfields = {
	"Conference_Workshop": {
		"Conf_Peer_reviewed":{
			"Paper_in_proceedings_full_paper_reviewed": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Paper_in_proceedings_abstract_reviewed": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Poster_in_proceedings_full_paper_reviewed": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Poster_in_proceedings_abstract_reviewed": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Demo": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Demo_URL", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Tutorial": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Demo_URL", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
		},
		"Conf_Non_Peer_reviewed": {
			"Edited_proceeding": ["bookEditor", "Book_Title","Book_Series", ["Publisher", "Publisher_Location"],
				["ISBN", "DOI"],
				["Volume", "Pages"], "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Invited_paper": ["author", "English_Title", "Conference_Title", ["Conference_Date_Start", "Conference_Date_End"], ["Conference_Location", "Year"], "Book_Title","Book_Series", "bookEditor", ["Volume", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			]
		},
	},
	"Book": {
		"Chapter_in_book": ["chapterAuthor", "Chapter_Title", "Book_Title","Book_Series", "bookEditor", ["Year", "Edition"],
			["Volume", "Pages"],
			["Publisher", "Publisher_Location"],
			["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
		],
		"Editor": ["author", "bookEditor", "Book_Title","Book_Series", ["Year", "Pages"],
			["Publisher", "Publisher_Location"],
			["Volume", "Edition"],
			["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
		],
		"Whole_book": ["author", "bookEditor", "Book_Title","Book_Series", ["Year", "Pages"],
			["Publisher", "Publisher_Location"],
			["Volume", "Edition"],
			["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
		],
		"Monograph": ["author", "bookEditor", "Book_Title","Book_Series", ["Year", "Pages"],
			["Publisher", "Publisher_Location"],
			["Volume", "Edition"],
			["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
		]
	},
	"Journal": {
		"Journal_Peer_reviewed": {
			"Journal_article": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Scientific_newsletter": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
		},
		"Journal_Non_Peer_reviewed": {
			"Foreword": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Journal_editorial": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Magazine_editorial": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
			"Other_journal": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			],
		},
		"Magazine":{
			"ERCIM_News": ["author", "English_Title", "Journal_Title", ["Volume", "Journal_Number"],
				["Year", "Pages"],
				["Publisher", "Publisher_Location"],
				["ISBN", "DOI"], "Local_Link", "project", "External_Link", "English_Abstract", "Tag"
			]
		}
	},
	"Other": {
		"FORTH_ICS_Tech_report": ["author", "English_Title", "Year", "Report_Number", "Local_Link", "project", "English_Abstract", "Tag"],
		"Other_tech_report": ["author", "English_Title", "Year", "DOI", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
		"Thesis": {
			"Master_thesis": ["author", "Greek_Title", "English_Title", "Year", "DOI", "Greek_Abstract", "English_Abstract", "supervisor", "Local_Link", "project", "External_Link", "Tag"],
			"Phd_thesis": ["author", "Greek_Title", "English_Title", "Year", "DOI", "Greek_Abstract", "English_Abstract", "supervisor", "Local_Link", "project", "External_Link", "Tag"],
		},
		"Event": {
			"Talk": ["author", "English_Title", "Year", "Event_Title", "Event_Location", "Other_Details", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
			"Seminar": ["author", "English_Title", "Year", "Event_Title", "Event_Location", "Other_Details", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
			"Distinguished_lecture": ["author", "English_Title", "Year", "Event_Title", "Event_Location", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
		},
		"Multimedia_material": ["author", "English_Title", "Year", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
		"White_paper": ["author", "English_Title", "Year", "DOI", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"],
		"Miscellaneous": ["author", "English_Title", "Year", "Location", "DOI", "Other_Details", "Local_Link", "project", "External_Link", "English_Abstract", "Tag"]
	}
};

//Required fields of each category
var JSONrequiredFields = {
  "Conference_Workshop": {
		"Conf_Peer_reviewed": {
	    "Paper_in_proceedings_full_paper_reviewed": ['author', 'English_Title', 'Year', 'Local_Link'],
	    "Paper_in_proceedings_abstract_reviewed": ['author', 'English_Title', 'Year', 'Local_Link'],
	    "Poster_in_proceedings_full_paper_reviewed": ['author', 'English_Title', 'Year', 'Local_Link'],
	    "Poster_in_proceedings_abstract_reviewed": ['author', 'English_Title', 'Year', 'Local_Link'],
	    "Demo": ['author', 'English_Title', 'Year'],
	    "Tutorial": ['author', 'English_Title', 'Year'],
		},
		"Conf_Non_Peer_reviewed": {
	    "Edited_proceeding": ['bookEditor', 'Book_Title', 'Book_Series', 'Year', 'Publisher', 'Publisher_Location'],
	    "Invited_paper": ['author', 'English_Title', 'Year', 'Local_Link'],
		},
  },
  "Book": {
    "Chapter_in_book": ['chapterAuthor', 'Chapter_Title', 'Book_Title', 'Year', 'Local_Link'],
    "Editor": ['author', 'bookEditor', 'Book_Title', 'Year', 'Local_Link'],
    "Whole_book": ['author', 'bookEditor', 'Book_Title', 'Year', 'Local_Link'],
    "Monograph": ['author', 'bookEditor', 'Book_Title', 'Year', 'Local_Link']
  },
  "Journal": {
		"Journal_Peer_reviewed": {
			'Journal_article': ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
	    'Scientific_newsletter': ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
		},
		"Journal_Non_Peer_reviewed": {
	    "Foreword": ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
	    "Journal_editorial": ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
	    'Magazine_editorial': ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
	    'Other_journal': ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link'],
		},
		"Magazine": {
	    'ERCIM_News': ['author', 'English_Title', 'Journal_Title', 'Year', 'Local_Link']
		},
  },
  "Other": {
    "FORTH_ICS_Tech_report": ['author', 'English_Title', 'Year', 'Report_Number', 'Local_Link'],
    "Other_tech_report": ['author', 'English_Title', 'Year'],
		"Thesis": {
			"Master_thesis": ['author', 'Greek_Title', 'English_Title', 'Year', 'Greek_Abstract', 'English_Abstract', 'supervisor'],
	    "Phd_thesis": ['author', 'Greek_Title', 'English_Title', 'Year', 'Greek_Abstract', 'English_Abstract', 'supervisor'],
		},
		"Event": {
			"Talk": ['author', 'English_Title', 'Year', 'Event_Title', 'Event_Location', 'Local_Link'],
	    "Seminar": ['author', 'English_Title', 'Year', 'Event_Title', 'Event_Location'],
			"Distinguished_lecture": ['author', 'English_Title', 'Year'],
		},
    "Multimedia_material": ['author', 'English_Title', 'Year', 'External_Link'],
    "White_paper": ['author', 'English_Title', 'Year'],
    "Miscellaneous": ['author', 'English_Title', 'Year']
  }
}

//Order of Contributor types for each Category
var JSONContributorOrder= {
    "Paper_in_proceedings_full_paper_reviewed": ['author', 'bookEditor'],
    "Paper_in_proceedings_abstract_reviewed": ['author', 'bookEditor'],
    "Poster_in_proceedings_full_paper_reviewed": ['author', 'bookEditor'],
    "Poster_in_proceedings_abstract_reviewed": ['author', 'bookEditor'],
    "Demo": ['author', 'bookEditor'],
    "Tutorial": ['author', 'bookEditor'],
    "Edited_proceeding": ['bookEditor'],
    "Invited_paper": ['author', 'bookEditor'],

    "Chapter_in_book": ['chapterAuthor', 'bookEditor'],
    "Editor": ['author', 'bookEditor'],
    "Whole_book": ['author', 'bookEditor'],
    "Monograph": ['author', 'bookEditor'],

    'Journal_article': ['author'],
    'Scientific_newsletter': ['author'],
    "Foreword": ['author'],
    "Journal_editorial": ['author'],
    'Magazine_editorial': ['author'],
    'Other_journal': ['author'],
    'ERCIM_News': ['author'],

    "FORTH_ICS_Tech_report": ['author'],
    "Other_tech_report": ['author'],
    "Talk": ['author'],
    "Master_thesis": ['author', 'supervisor'],
    "Phd_thesis": ['author', 'supervisor'],
    "Seminar": ['author'],
    "Multimedia_material": ['author'],
    "White_paper": ['author'],
    "Miscellaneous": ['author'],
};

//The default title of each category
var titleFields = {
  "Conference_Workshop": {
    "Paper_in_proceedings_full_paper_reviewed": 'English_Title',
    "Paper_in_proceedings_abstract_reviewed": 'English_Title',
    "Poster_in_proceedings_full_paper_reviewed": 'English_Title',
    "Poster_in_proceedings_abstract_reviewed": 'English_Title',
    "Demo": 'English_Title',
    "Tutorial": 'English_Title',
    "Edited_proceeding": 'Book_Title',
    "Invited_paper": 'English_Title'
  },
  "Book": {
    "Chapter_in_book": 'Chapter_Title',
    "Editor": 'Book_Title',
    "Whole_book": 'Book_Title',
    "Monograph": 'Book_Title'
  },
  "Journal": {
    'Journal_article': 'English_Title',
    'Scientific_newsletter': 'English_Title',
    "Foreword": 'English_Title',
    "Journal_editorial": 'English_Title',
    'Magazine_editorial': 'English_Title',
    'Other_journal': 'English_Title',
    'ERCIM_News': 'English_Title'
  },
  "Other": {
    "FORTH_ICS_Tech_report": 'English_Title',
    "Other_tech_report": 'English_Title',
    "Talk": 'English_Title',
    "Master_thesis": 'English_Title',
    "Phd_thesis": 'English_Title',
    "Seminar": 'English_Title',
    "Multimedia_material": 'English_Title',
    "White_paper": 'English_Title',
    "Miscellaneous": 'English_Title',
  }
}

//DOI Category to PRESS Convertion
var doiCategoriesToPMS = {
  'book-section':['Book', 'Chapter_in_book'],
  'monograph': ['Book', 'Monograph'],
  'report': ['Other', 'Other_tech_report'],
  'journal-article': ['Journal', 'Journal_article'],
  'book-part': ['Book', 'Chapter_in_book'],
  'other': ['Other', 'Miscellaneous'],
  'book': ['Book', 'Whole_book'],
  'proceedings-article': ['Conference_Workshop', 'Paper_in_proceedings_full_paper_reviewed'],
  'book-chapter': ['Book', 'Chapter_in_book'],
  'report-series': ['Other', 'Other_tech_report'],
  'proceedings': ['Conference_Workshop', 'Paper_in_proceedings_full_paper_reviewed'],
  'journal-issue': ['Journal', 'Other_journal'],
  'book-series': ['Book', 'Whole_book'],
  'edited-book': ['Book', 'Editor'],
  'journal': ['Journal', 'Other_journal']
}

//Convertion of DOI String data to PRESS Data
var doiFieldsToPMS = {
  'DOI': 'DOI',
  'page': 'Pages',
  'publisher': 'Publisher',
  'publisher-location': 'Publisher_Location',
  //'URL': 'external',
  'abstract': 'English_Abstract',
  'volume': 'Volume'
}

//Object Properties of the Ontology
var objectProperties = {
	author: "author",
	chapterAuthor: "chapterAuthor",
	supervisor: "supervisor",
	bookEditor: "bookEditor",
	project: "belongsTo",
	lab: "belongsTo"
};

//Person Field Labels
var personFields = {
	'author': 'Authors',
	'chapterAuthor': 'Chapter Authors',
	'supervisor': 'Supervisors',
	'bookEditor': 'Book Editors'
};
