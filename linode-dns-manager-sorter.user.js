// ==UserScript==
// @name        Linode DNS Manager Sorter
// @namespace   http://bullseyelabs.com
// @description Sorts the master Linode DNS Manager table by descending levels: first by TLD, then by SLD, etc.
// @include     https://www.linode.com/members/dns/
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
bullseyelabs.ldms.tsorter = function(cmp_spec)  {
    this.cmp_spec = cmp_spec;
    this.tr_dict = new Object();
    this.tr_order = new Array();
    return this;
},

bullseyelabs.ldms.tsorter.prototype = {
    /* parse the html table node */
    parse_table: function() { throw "'parse_table' not impl"; },

    /* do the sort */
    sort_rows: function() {
        var cmp_spec = this.cmp_spec;
        var cmp_func = function(a, b) {
            for (var i=0; i<cmp_spec.length; i++) {
                var order_key = cmp_spec[i]['key'];
                var cur_cmp_func = cmp_spec[i]['func'];
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

/* type1 tables */
bullseyelabs.ldms.tsorter_type1 = function(table_id, cmp_spec) {
    var me = new bullseyelabs.ldms.tsorter(cmp_spec);
    me.tbody_node = document.getElementById(table_id).tBodies[0];

    me.parse_table = function() {
        var get_domain =  function(tr) {
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
        while (this.tbody_node.firstChild)
            this.tbody_node.removeChild(this.tbody_node.firstChild);

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

/* type2 tables */
bullseyelabs.ldms.tsorter_type2 = function() {
    // TODO: this.
};

bullseyelabs.ldms.main = function() {
    if (window.location.pathname.lastIndexOf('domain_view.cfm') == -1) {
        /* we're on the DNS manager front page */
        // TODO: move this info to a config area
        var ts = new bullseyelabs.ldms.tsorter_type1(
            'tablekit-table-1',
            new Array(
                {'key': 'domain', 'func': bullseyelabs.ldms.cmp.domain}
            )
        );
        ts.run();
    }
    else {
        /* we're on the DNS domain detail page */
        alert('ur?');
    }
};

/* onload handler */
bullseyelabs.ldms.onLoadHandler = {
    handleEvent: function(evt) {
        bullseyelabs.ldms.main();
    },
};

window.addEventListener('load', bullseyelabs.ldms.onLoadHandler, false);

