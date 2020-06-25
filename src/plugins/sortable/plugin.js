/**
 * @class Sortable
 * @memberof module:plugins
 * @description Enables drag & drop sort of rules.
 * @param {object} [options]
 * @param {boolean} [options.inherit_no_drop=true]
 * @param {boolean} [options.inherit_no_sortable=true]
 * @param {string} [options.icon='glyphicon glyphicon-sort']
 * @throws MissingLibraryError, ConfigError
 */
QueryBuilder.define('sortable', function(options) {
    if (!('interact' in window)) {
        Utils.error('MissingLibrary', 'interact.js is required to use "sortable" plugin. Get it here: http://interactjs.io');
    }

    if (options.default_no_sortable !== undefined) {
        Utils.error(false, 'Config', 'Sortable plugin : "default_no_sortable" options is deprecated, use standard "default_rule_flags" and "default_group_flags" instead');
        this.settings.default_rule_flags.no_sortable = this.settings.default_group_flags.no_sortable = options.default_no_sortable;
    }

    // recompute drop-zones during drag (when a rule is hidden)
    interact.dynamicDrop(true);

    // set move threshold to 10px
    interact.pointerMoveTolerance(10);

    var placeholder;
    var ghost;
    var src;
    var moved;

    var autoScrollContainer = options.autoScrollContainer || this.$el[0];
    var autoScrollContainerIsExternal = autoScrollContainer!==this.$el[0];
    var autoScrollContainerSelector = options.autoScrollContainerSelector;
    // Init drag and drop
    this.on('afterAddRule afterAddGroup', function(e, node) {
        if (node == placeholder) {
            return;
        }

        var self = e.builder;

        // Inherit flags
        if (options.inherit_no_sortable && node.parent && node.parent.flags.no_sortable) {
            node.flags.no_sortable = true;
        }
        if (options.inherit_no_drop && node.parent && node.parent.flags.no_drop) {
            node.flags.no_drop = true;
        }

        // Configure drag
        if (!node.flags.no_sortable) {
            interact(node.$el[0])
                .draggable({
                    allowFrom: QueryBuilder.selectors.drag_handle,
                    autoScroll: {container: autoScrollContainer},
                    // autoScroll: true,
                    onstart: function(event) {
                        moved = false;

                        // get model of dragged element
                        src = self.getModel(event.target);

                        // create ghost
                        ghost = src.$el.clone()
                            .appendTo(src.$el.parent())
                            .width(src.$el.outerWidth())
                            .addClass('dragging')
                            .css('position','fixed')
                            ;
						var bcr = event.target.getBoundingClientRect();
                        var x = bcr.x, y=bcr.y;
                        //console.log("onstart x="+x+" y="+y);
                        //if(autoScrollContainerIsExternal){
                            y += (autoScrollContainerSelector ? $(autoScrollContainerSelector).scrollTop() : autoScrollContainer.scrollTop);
                            x += (autoScrollContainerSelector ? $(autoScrollContainerSelector).scrollLeft() : autoScrollContainer.scrollLeft);
                            //console.log("onstart scrolled x="+x+" y="+y);
                        //}
                        ghost[0].style.top = y + 'px';
                        ghost[0].style.left = x + 'px';
                        
                        // create drop placeholder
                        var ph = $('<div class="rule-placeholder">&nbsp;</div>')
                            .height(src.$el.outerHeight());

                        placeholder = src.parent.addRule(ph, src.getPos());

                        // hide dragged element
                        src.$el.hide();
                    },
                    onmove: function(event) {
                        // make the ghost follow the cursor
                        if (ghost && ghost[0]){

                            /*var x= event.clientX - 15, 
                                y= event.clientY - 15;
                            */
                        	var y = ghost[0].style.top;
                        	var x = ghost[0].style.left;
                        	y = y.substr(0, y.length - 2);
                        	x = x.substr(0, x.length - 2);
                        	//console.log("onmove-start x="+x+" y="+y);
                        	/*
                            if(autoScrollContainerIsExternal){
                                y += autoScrollContainer.scrollTop;
                                x += autoScrollContainer.scrollLeft;
                            }
                            */
                            //console.log("onmove-diff dx="+event.dx+" dy="+event.dy);
                            x = +x + +event.dx;
                            y = +y + +event.dy;
                            //console.log("onmove-end x="+x+" y="+y);
                            ghost[0].style.top = y + 'px';
                            ghost[0].style.left = x + 'px';
                        }
                        // console.log('top:' + ghost[0].style.top + ' clientY:' + event.clientY + ' clientY0:' + event.clientY0 + ' pageY:'+event.pageY);
                        // console.dir(event.target);
                        // console.dir(autoScrollContainer);
                    },
                    onend: function(event) {
                        // starting from Interact 1.3.3, onend is called before ondrop
                        if (event.dropzone) {
                            moveSortableToTarget(src, $(event.relatedTarget), self);
                            moved = true;
                        }
                        // remove ghost
                        if(ghost)
                            ghost.remove();
                        ghost = undefined;

                        // remove placeholder
                        placeholder.drop();
                        placeholder = undefined;

                        // show element
                        src.$el.css('display', '');

                        /**
                         * After a node has been moved with {@link module:plugins.Sortable}
                         * @event afterMove
                         * @memberof module:plugins.Sortable
                         * @param {Node} node
                         */
                        self.trigger('afterMove', src);

                        self.trigger('rulesChanged');
                    }
                });
        }

        if (!node.flags.no_drop) {
            //  Configure drop on groups and rules
            interact(node.$el[0])
                .dropzone({
                    accept: QueryBuilder.selectors.rule_and_group_containers,
                    ondragenter: function(event) {
                        moveSortableToTarget(placeholder, $(event.target), self);
                    },
                    ondrop: function(event) {
                        if (!moved) {
                            moveSortableToTarget(src, $(event.target), self);
                        }
                    }
                });

            // Configure drop on group headers
            if (node instanceof Group) {
                interact(node.$el.find(QueryBuilder.selectors.group_header)[0])
                    .dropzone({
                        accept: QueryBuilder.selectors.rule_and_group_containers,
                        ondragenter: function(event) {
                            moveSortableToTarget(placeholder, $(event.target), self);
                        },
                        ondrop: function(event) {
                            if (!moved) {
                                moveSortableToTarget(src, $(event.target), self);
                            }
                        }
                    });
            }
        }
    });

    // Detach interactables
    this.on('beforeDeleteRule beforeDeleteGroup', function(e, node) {
        if (!e.isDefaultPrevented()) {
            interact(node.$el[0]).unset();

            if (node instanceof Group) {
                interact(node.$el.find(QueryBuilder.selectors.group_header)[0]).unset();
            }
        }
    });

    // Remove drag handle from non-sortable items
    this.on('afterApplyRuleFlags afterApplyGroupFlags', function(e, node) {
        if (node.flags.no_sortable) {
            node.$el.find(QueryBuilder.selectors.drag_handle).remove();
        }
    });

    // Modify templates
    if (!options.disable_template) {
        this.on('getGroupTemplate.filter', function(h, level) {
            if (level > 1) {
                var $h = $(h.value);
                $h.find(QueryBuilder.selectors.condition_container).after('<div class="drag-handle"><i class="' + options.icon + '"></i></div>');
                h.value = $h.prop('outerHTML');
            }
        });

        this.on('getRuleTemplate.filter', function(h) {
            var $h = $(h.value);
            $h.find(QueryBuilder.selectors.rule_header).after('<div class="drag-handle"><i class="' + options.icon + '"></i></div>');
            h.value = $h.prop('outerHTML');
        });
    }
}, {
    inherit_no_sortable: true,
    inherit_no_drop: true,
    icon: 'glyphicon glyphicon-sort',
    disable_template: false
});

QueryBuilder.selectors.rule_and_group_containers = QueryBuilder.selectors.rule_container + ', ' + QueryBuilder.selectors.group_container;
QueryBuilder.selectors.drag_handle = '.drag-handle';

QueryBuilder.defaults({
    default_rule_flags: {
        no_sortable: false,
        no_drop: false
    },
    default_group_flags: {
        no_sortable: false,
        no_drop: false
    }
});

/**
 * Moves an element (placeholder or actual object) depending on active target
 * @memberof module:plugins.Sortable
 * @param {Node} node
 * @param {jQuery} target
 * @param {QueryBuilder} [builder]
 * @private
 */
function moveSortableToTarget(node, target, builder) {
    var parent, method;
    var Selectors = QueryBuilder.selectors;

    // on rule
    parent = target.closest(Selectors.rule_container);
    if (parent.length) {
        method = 'moveAfter';
    }

    // on group header
    if (!method) {
        parent = target.closest(Selectors.group_header);
        if (parent.length) {
            parent = target.closest(Selectors.group_container);
            method = 'moveAtBegin';
        }
    }

    // on group
    if (!method) {
        parent = target.closest(Selectors.group_container);
        if (parent.length) {
            method = 'moveAtEnd';
        }
    }

    if (method) {
        node[method](builder.getModel(parent));

        // refresh radio value
        if (builder && node instanceof Rule) {
            builder.setRuleInputValue(node, node.value);
        }
    }
}
