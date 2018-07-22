(function(factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }

})
(function ($) {
    $.fn.SumoSelect = function () {
        var settings = $.extend({
            csvDispCount: 0,              // display no. of items in multiselect. 0 to display all.
            floatWidth: 400,              // Screen width of device at which the list is rendered in floating popup fashion.
            okCancelInMulti: false,       // display ok cancel buttons in desktop mode multiselect also.

            prefix: '',                   // some prefix usually the field name. eg. '<b>Hello</b>'
            locale: ['OK', 'Cancel', 'Select All'],  // all text that is used. don't change the index.
            showTitle: true               // set to false to prevent title (tooltip) from appearing
        });

        this.each(function () {
            var selObj = this; // the original select object.

            if (this.sumo || !$(this).is('select')) return; //already initialized

            this.sumo = {
                E: $(selObj),   //the jquery object of original select element.
                is_multi: $(selObj).attr('multiple'),  //if its a multiple select



                createElems: function () {
                    var O = this;
                    O.E.wrap('<div class="SumoSelect" tabindex="0" role="button" aria-expanded="false">');
                    O.select = O.E.parent();
                    O.caption = $('<span>');
                    O.CaptionCont = $('<p class="CaptionCont SelectBox" ><label><i></i></label></p>')
                        .attr('style', O.E.attr('style'))
                        .prepend(O.caption);
                    O.select.append(O.CaptionCont);

                    //hide hidden select
                    O.E.addClass('SumoUnder').attr('tabindex','-1');

                    //Create the list
                    O.optDiv = $('<div class="optWrapper '+ (settings.up?'up':'') +'">');

                    //Creating the markup for the available options
                    O.ul = $('<ul class="options">');
                    O.optDiv.append(O.ul);
                    O.ul.append(O.prepItems(O.E.children()));

                    if (O.is_multi) O.multiSelect();

                    O.select.append(O.optDiv);
                    O.basicEvents();
                },

                prepItems: function(opts, d){
                    var list = [], O=this;
                    $(opts).each(function (i, opt) {       // parsing options to li
                        opt = $(opt);
                        list.push(opt.is('optgroup')?
                            $('<li class="group '+ (opt[0].disabled?'disabled':'') +'"><label>' + opt.attr('label') +'</label><ul></ul></li>')
                                .find('ul')
                                .append(O.prepItems(opt.children(), opt[0].disabled))
                                .end()
                            :
                            O.createLi(opt, d)
                        );
                    });
                    return list;
                },

                //Creates a LI element from a given option and binds events to it
                //returns the jquery instance of li (not inserted in dom)
                createLi: function (opt, d) {
                    var O = this;
                    //console.log(O);
                    if(!opt.attr('value'))opt.attr('value',opt.val());
                    var li = $('<li class="opt"><label>' + opt.text() + '</label></li>');

                    li.data('opt', opt);    // store a direct reference to option.
                    if (O.is_multi) li.append('<span><i></i></span>');

                    O.onOptClick(li);

                    return li;
                },

                multiSelect: function () {
                    var O = this;
                    O.optDiv.addClass('multiple');
                },

                showOpts: function () {
                    var O = this;
                    if (O.E.attr('disabled')) return; // if select is disabled then retrun
                    O.E.trigger('sumo:opening', O);
                    O.is_opened = true;
                    O.select.addClass('open').attr('aria-expanded', 'true');
                    O.E.trigger('sumo:opened', O);

                    if(O.ftxt)O.ftxt.focus();
                    else O.select.focus();

                    // hide options on click outside.
                    $(document).on('click.sumo', function (e) {
                        if (!O.select.is(e.target) && O.select.has(e.target).length === 0){
                            if(!O.is_opened)return;
                            O.hideOpts();
                        }
                    });

                },

                hideOpts: function () {
                    var O = this;
                    if(O.is_opened){
                        O.E.trigger('sumo:closing', O);
                        O.is_opened = false;
                        O.select.removeClass('open').attr('aria-expanded', 'true').find('ul li.sel').removeClass('sel');
                        O.E.trigger('sumo:closed', O);
                        $(document).off('click.sumo');
                        O.select.focus();
                        $('body').removeClass('sumoStopScroll');

                        // clear the search
                        if(settings.search){
                            O.ftxt.val('');
                            O.ftxt.trigger('keyup.sumo');
                        }
                    }
                },
                setOnOpen: function () {
                    var O = this,
                        li = O.optDiv.find('li.opt:not(.hidden)').eq(settings.search?0:O.E[0].selectedIndex);
                    if(li.hasClass('disabled')){
                        li = li.next(':not(disabled)')
                        if(!li.length) return;
                    }
                    O.optDiv.find('li.sel').removeClass('sel');
                    li.addClass('sel');
                    O.showOpts();
                },
                nav: function (up) {
                    var O = this, c,
                        s=O.ul.find('li.opt:not(.disabled, .hidden)'),
                        sel = O.ul.find('li.opt.sel:not(.hidden)'),
                        idx = s.index(sel);
                    if (O.is_opened && sel.length) {

                        if (up && idx > 0)
                            c = s.eq(idx-1);
                        else if(!up && idx < s.length-1 && idx > -1)
                            c = s.eq(idx+1);
                        else return;

                        sel.removeClass('sel');
                        sel = c.addClass('sel');

                        // setting sel item to visible view.
                        var ul = O.ul,
                            st = ul.scrollTop(),
                            t = sel.position().top + st;
                        if(t >= st + ul.height()-sel.outerHeight())
                            ul.scrollTop(t - ul.height() + sel.outerHeight());
                        if(t<st)
                            ul.scrollTop(t);

                    }
                    else
                        O.setOnOpen();
                },

                basicEvents: function () {
                    var O = this;
                    O.CaptionCont.click(function () {
                        O.E.trigger('click');
                        if (O.is_opened) O.hideOpts();
                        else O.showOpts();
                    });

                    //working with keyboard
                    O.select.on('keydown.sumo', function (e) {
                        switch (e.which) {
                            case 38: // up
                                O.nav(true);
                                break;

                            case 40: // down
                                O.nav(false);
                                break;

                            case 32: // space
                                if(settings.search && O.ftxt.is(e.target))return;
                            case 13: // enter
                                if (O.is_opened)
                                    O.optDiv.find('ul li.sel').trigger('click');
                                else
                                    O.setOnOpen();
                                break;
                            case 9:	 //tab
                                if(!settings.okCancelInMulti)
                                    O.hideOpts();
                                return;
                            case 27: // esc
                                if(settings.okCancelInMulti)O._cnbtn();
                                    O.hideOpts();
                                return;

                            default:
                                return; //exit for other keys
                        }
                    });
                },

                onOptClick: function (li) {
                    var O = this;
                    li.click(function () {
                        var li = $(this);
                        if(li.hasClass('disabled'))return;
                        var txt = "";
                        if (O.is_multi) {
                            li.toggleClass('selected');
                            li.data('opt')[0].selected = li.hasClass('selected');
                            // O.selAllState();
                        }
                        else {
                            li.parent().find('li.selected').removeClass('selected');
                            li.toggleClass('selected');
                            li.data('opt')[0].selected = true;
                        }

                        //branch for combined change event.
                        if (!(O.is_multi && settings.triggerChangeCombined && (O.is_floating || settings.okCancelInMulti))) {
                            O.setText();
                        }

                        if (!O.is_multi) O.hideOpts();
                    });
                },

                setText: function () {
                    var O = this;
                    O.placeholder = "";
                    if (O.is_multi) {

                        sels = O.E.find(':selected').not(':disabled'); //selected options.

                        for (i = 0; i < sels.length; i++) {
                            O.placeholder += $(sels[i]).text() + ", ";
                        }
                    }
                    else {
                        O.placeholder = O.E.find(':selected').not(':disabled').text();
                    }

                    var is_placeholder = false;

                    if (!O.placeholder) {

                        is_placeholder = true;

                        O.placeholder = O.E.attr('placeholder');
                    }

                    O.placeholder = O.placeholder ? (settings.prefix + ' ' + O.placeholder) : settings.placeholder

                    //set display text
                    O.caption.html(O.placeholder);

                    //add class placeholder
                    if (is_placeholder) O.caption.addClass('placeholder'); else O.caption.removeClass('placeholder');
                },

                init: function () {
                    var O = this;
                    O.createElems();
                    O.setText();
                    return O
                }

            };
            selObj.sumo.init();
        });
    };


});