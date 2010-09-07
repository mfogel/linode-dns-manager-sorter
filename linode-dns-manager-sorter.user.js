// ==UserScript==
// @name        Linode DNS Manager Sorter
// @namespace   http://bullseyelabs.com
// @description Sorts the master Linode DNS Manager table by descending levels: first by TLD, then by SLD, etc.
// @include     https://www.linode.com/members/dns/
// @author      Mike Fogel
// @version     0.1
// ==/UserScript==


/* set up my namespace */
if (window.bullseyelabs === undefined) bullseyelabs = new Object();

bullseyelabs.ldms = {

    /* constants */
    table_id: 'tablekit-table-1',

    /* local structure, state */
    tbody_node: null,
    tr_dict: new Object(),
    tr_order: new Array(),

    /* used as a compare func for ordered_array.sort(cmp_func) */
    domain_cmp: function(dom1, dom2) {
        var d1p = this.domain_parse(dom1);
        var d2p = this.domain_parse(dom2);
        return this.domain_cmp_recurse(d1p, d2p);
    },

    /* recursively compare down 'levels' in the domains */
    domain_cmp_recurse: function(d1, d2) {
        if (d1.length == 0 && d2.length == 0) return 0;
        if (d1.length == 0) return -1;
        if (d2.length == 0) return 1;
        if (d1[0] != d2[0]) return (d1[0] < d2[0] ? -1 : 1);
        return this.domain_cmp_recurse(d1.slice(1), d2.slice(1));
    },

    /* parse a domain into an array of 'levels' */
    domain_parse: function(dom) {
        var pieces = dom.split('.');
        pieces.reverse();
        return pieces;
    },

    /* parse the html table node */
    parse_table: function() {
        for (var i=0; i<this.tbody_node.childNodes.length; i++) {
            var elem = this.tbody_node.childNodes[i];
            if (elem.tagName == undefined ||
                elem.tagName.toLowerCase() != 'tr') continue;
            var dom = this.parse_row(elem);
            this.tr_dict[dom] = elem;
            this.tr_order.push(dom);
        }
    },

    /* parse an individual table node */
    parse_row: function(tr) {
        tr.td = tr.childNodes[1];
        var dom = tr.td.childNodes[1].firstChild.firstChild.wholeText;
        return dom;
    },

    /* sort the internal data structures */
    sort_rows: function() {
        this.tr_order.sort(
            function(a, b) { return bullseyelabs.ldms.domain_cmp(a, b); });
    },

    /* redisplay the table to reflect internal data structs */
    refresh_table: function() {
        while (this.tbody_node.firstChild)
            this.tbody_node.removeChild(this.tbody_node.firstChild);

        for (var i=0; i<this.tr_order.length; i++) {
            var classname = (i % 2 ? 'roweven' : 'rowodd');

            var tr = this.tr_dict[this.tr_order[i]];
            tr.td.style.textAlign = 'right';
            tr.className = classname;
            this.tbody_node.appendChild(tr);
        }
    },

    init: function() {
        var table_node = document.getElementById(this.table_id);
        this.tbody_node = table_node.tBodies[0];
        this.parse_table();
        this.sort_rows();
        this.refresh_table();
    },
};

window.addEventListener(
    'load', function(evt) { bullseyelabs.ldms.init(); }, false);

