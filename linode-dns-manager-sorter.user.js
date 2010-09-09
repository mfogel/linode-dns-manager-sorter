// ==UserScript==
// @name        Linode DNS Manager Sorter
// @namespace   http://bullseyelabs.com
// @description Intuitive sorting of Linode DNS Manager tables.
// @include     https://www.linode.com/members/dns/*
// @author      Mike Fogel
// @version     0.2
// ==/UserScript==


/* set up my namespace */
if (window.bullseyelabs === undefined) bullseyelabs = new Object();
if (bullseyelabs.ldms === undefined) bullseyelabs.ldms = new Object();

/* a library of comparison funcs */
bullseyelabs.ldms.cmp = {

    /* cmpare domains for ordered_array.sort(cmp_func) */
    domain: function(dom1, dom2) {
        /* parse a domain into an array of 'levels' */
        var domain_parse = function(dom) {
            var pieces = dom.split('.');
            pieces.reverse();
            return pieces;
        };

        /* recursively compare down 'levels' in the domains */
        var domain_cmp_recurse = function(d1, d2) {
            if (d1.length == 0 && d2.length == 0) return 0;
            if (d1.length == 0) return -1;
            if (d2.length == 0) return 1;
            if (d1[0] != d2[0]) return (d1[0] < d2[0] ? -1 : 1);
            return arguments.callee(d1.slice(1), d2.slice(1));
        };

        var d1p = domain_parse(dom1);
        var d2p = domain_parse(dom2);
        return domain_cmp_recurse(d1p, d2p);
    },

    /* cmpare ints for ordered_array.sort(cmp_func) */
    int: function(n1, n2) {
        var i1 = parseInt(n1);
        var i2 = parseInt(n2);
        if (i1 == i2) return 0;
        return (i1 < i2 ? -1 : 1);
    },

    /* cmpare words for ordered_array.sort(cmp_func) */
    alpha: function(a1, c2) {
        if (a1 == a2) return 0;
        return (a1 < a2 ? -1 : 1);
    },

    /* cmpare ipaddrs for ordered_array.sort(cmp_func) */
    ipaddr: function(ip1, ip2) {
        var p1 = ip1.split('.');
        var p2 = ip2.split('.');
        for (var i=0; i<4; i++) {
            var r = bullseyelabs.ldms.cmp.int(p1[i], p2[i]);
            if (r != 0) return r;
        }
        return 0;
    },

    /* cmpare email addrs for ordered_array.sortcmp_func) */
    email: function(e1, e2) {
        var p1 = e1.split('@');
        var p2 = e2.split('@');
        /* first compare the domains */
        var r = bullseyelabs.ldms.cmp.domain(p1[1], p2[1]);
        if (r != 0) return r;
        /* 2nd go to the usernames */
        return bullseyelabs.ldms.cmp.alpha(p1[0], p2[0]);
    },
};

/* abstract parent object */
bullseyelabs.ldms.tsorter = function(cmp_order, cmp_funcs)  {
    this.cmp_order = cmp_order;
    this.cmp_funcs = cmp_funcs;
    this.tr_dict = new Object();
    this.tr_order = new Array();
    return this;
},

bullseyelabs.ldms.tsorter.prototype = {
    /* parse the html table node */
    parse_table: function() { throw "'parse_table' not impl"; },

    /* do the sort */
    sort_rows: function() {
        var cmp_order = this.cmp_order;
        var cmp_funcs = this.cmp_funcs;
        var cmp_func = function(a, b) {
            for (var i=0; i<cmp_order.length; i++) {
                var order_key = cmp_order[i];
                var cur_cmp_func = cmp_funcs[order_key];
                var r = cur_cmp_func(a[order_key], b[order_key]);
                if (r != 0) return r;
            }
            return 0;
        };
        this.tr_order.sort(
            function(a, b) { return cmp_func(a, b); }
        );
    },

    /* redisplay the table to reflect internal data structs */
    refresh_table: function() { throw "'refresh_table' not impl"; },

    /* run the object */
    run: function() {
        this.parse_table();
        this.sort_rows();
        this.refresh_table();
    },
},

/* overview tables */
bullseyelabs.ldms.tsorter_overview = function(table_id, cmp_order, cmp_funcs) {
    var me = new bullseyelabs.ldms.tsorter(cmp_order, cmp_funcs);
    me.tbody_node = document.getElementById(table_id).tBodies[0];

    me.parse_table = function() {
        var get_domain =  function(tr) {
            // TODO: change this to use tr.children?
            tr.td = tr.childNodes[1];
            var dom = tr.td.childNodes[1].firstChild.firstChild.wholeText;
            return dom;
        };

        for (var i=0; i<this.tbody_node.childNodes.length; i++) {
            var elem = this.tbody_node.childNodes[i];
            if (elem.tagName == undefined ||
                elem.tagName.toLowerCase() != 'tr') continue;
                this.tr_dict[i] = elem;
            var dom = get_domain(elem);
            var tr_val = {
                'domain': dom,
                'dict_key': i,
            };
            this.tr_order.push(tr_val);
        }
    };

    me.refresh_table = function() {
        while (this.tbody_node.firstChild) {
            this.tbody_node.removeChild(this.tbody_node.firstChild);
        }

        for (var i=0; i<this.tr_order.length; i++) {
            var classname = (i % 2 ? 'roweven' : 'rowodd');

            var dict_key = this.tr_order[i]['dict_key'];
            var tr = this.tr_dict[dict_key];
            tr.td.style.textAlign = 'right';
            tr.className = classname;
            this.tbody_node.appendChild(tr);
        }
    };

    return me;
},

/* detail tables */
bullseyelabs.ldms.tsorter_detail = function(title, cmp_order, cmp_funcs) {
    var me = new bullseyelabs.ldms.tsorter(cmp_order, cmp_funcs);
    me.table_title = title;

    /* find our tbody node to operate on. */
    var parent_div = document.getElementById('page');
    var tbody_node = null;
    for (var i=0; i<parent_div.children.length; i++) {
        var elem = parent_div.children[i];
        if (elem.tagName != 'TABLE') continue;
        var tbody_poss = elem.tBodies[0].firstElementChild
                         .firstElementChild.firstElementChild.tBodies[0];
        var tc_title_poss = tbody_poss.firstElementChild.firstElementChild;
        if (tc_title_poss.firstChild.wholeText == title) {
            tbody_node = tbody_poss;
            break;
        }
    }
    if (tbody_node === null) {
        throw "Table with title '" + title + "' not found";
    }
    me.tbody_node = tbody_node;
    me.tr_header = tbody_node.firstElementChild.nextElementSibling;

    me.parse_table = function() {
        var tr_header = this.tr_header;
        var get_cell_index = function(col_header) {
            var indx = null;
            for (var i=0; i<tr_header.children.length; i++) {
                var td = tr_header.children[i];
                if (td.firstChild.wholeText == col_header) {
                    indx = i;
                    break;
                }
            }
            if (indx === null) {
                throw "Column with header '" + col_header +"' not found";
            }
            return indx;
        };

        var get_cell_value = function(tr, indx) {
            var td = tr.children[indx];
            var val = '';
            if (td.firstChild != null) {
                val = td.firstChild.wholeText;
            }
            return val;
        };

        var cell_indexes = new Object();
        for (var i=0; i<cmp_order.length; i++) {
            var col_header = cmp_order[i];
            cell_indexes[col_header] = get_cell_index(col_header);
        }

        /* skip the green title bar, the header row, and the 'add new' row */
        for (var i=2; i<this.tbody_node.children.length-1; i++) {
            var tr = this.tbody_node.children[i];
            this.tr_dict[i] = tr;
            var cmp_obj = new Object();
            for (var j=0; j<cmp_order.length; j++) {
                var col_header = cmp_order[j];
                var val = get_cell_value(tr, cell_indexes[col_header]);
                cmp_obj[col_header] = val;
            }

            cmp_obj['dict_key'] = i;
            this.tr_order.push(cmp_obj);
        }

    };

    me.refresh_table = function() {

        var set_tr_classname = function(tr, classname) {
            /* need to push this down to all the td's */
            tr.className = classname;
            for (var i=0; i<tr.children.length; i++) {
                tr.children[i].className = classname;
            }
        };

        /* save the 'add new' row, but poss change bgd color  */
        var tr_add_new = this.tbody_node.lastElementChild;
        this.tbody_node.removeChild(tr_add_new);

        /* clear all except the green title bar & header rows */
        while (this.tbody_node.children.length > 2) {
            this.tbody_node.removeChild(this.tbody_node.lastElementChild);
        }

        for (var i=0; i<this.tr_order.length; i++) {
            var classname = (i % 2 ? 'tablenote_alt' : 'tablenote');

            var dict_key = this.tr_order[i]['dict_key'];
            var tr = this.tr_dict[dict_key];
            set_tr_classname(tr, classname);

            this.tbody_node.appendChild(tr);
        }
        var c = (this.tr_order.length % 2 ? 'tablenote_alt' : 'tablenote');
        set_tr_classname(tr_add_new, c);
        this.tbody_node.appendChild(tr_add_new);

    };

    return me;
};

bullseyelabs.ldms.main = function() {
    /* are we on the overview or detail DNS manager page? */
    if (window.location.pathname.indexOf('domain_view.cfm') == -1) {
        /* front page */

        /* overview table config */
        var overview_table_id = 'tablekit-table-1';
        var overview_cmp_order = new Array('domain');
        var overview_cmp_funcs = {'domain': bullseyelabs.ldms.cmp.domain};

        new bullseyelabs.ldms.tsorter_overview(
            overview_table_id,
            overview_cmp_order,
            overview_cmp_funcs
        ).run();
    }
    else {
        /* detail page */

        /* detail table config */
        var cmp_lib = bullseyelabs.ldms.cmp;
        var detail_conf = {
            'NS Records': {
                'order': ['Subdomain', 'Name Server'],
                'funcs': {
                    'Subdomain': cmp_lib.domain,
                    'Name Server': cmp_lib.domain,
                },
            },
            'MX Records': {
                'order': ['Preference', 'Mail Server'],
                'funcs': {
                    'Preference': cmp_lib.int,
                    'Mail Server': cmp_lib.domain,
                },
            },
            'A/AAAA Records': {
                'order': ['Host Name', 'IP Address'],
                'funcs': {
                    'Host Name': cmp_lib.domain,
                    'IP Address': cmp_lib.ipaddr,
                },
            },
            'CNAME Records': {
                'order': ['Host Name', 'Aliases to'],
                'funcs': {
                    'Host Name': cmp_lib.domain,
                    'Aliases to': cmp_lib.domain,
                },
            },
            /* add something for TXT & SRV records here? */
        };

        for (var k in detail_conf) {
            var title = k;
            var cmp_order = detail_conf[k]['order'];
            var cmp_funcs = detail_conf[k]['funcs'];

            new bullseyelabs.ldms.tsorter_detail(
                title,
                cmp_order,
                cmp_funcs
            ).run();
        }
    }
};

/* onload handler */
bullseyelabs.ldms.onLoadHandler = {
    handleEvent: function(evt) {
        bullseyelabs.ldms.main();
    },
};

window.addEventListener('load', bullseyelabs.ldms.onLoadHandler, false);

