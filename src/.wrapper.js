(function(root, factory) {
    if (typeof define == 'function' && define.amd) {
        define(['jquery', 'dot/doT', 'jquery-extendext', window], factory);
    }
    else if (typeof module === 'object' && module.exports) {
        if(root.document){
            module.exports = factory(require('jquery'), require('dot/doT'), require('jquery-extendext'));
        } else {
            module.exports = function( $, window ) {
				if ( !$ ) {
					throw new Error( "jQuery QueryBuilder requires a jQuery Instance" );
				}
				return factory( $, require('dot/doT'), undefined, window);
			};
        }
    }
    else {
        factory(root.jQuery, root.doT, undefined, window);
    }
}(this, function($, doT, ext, window) {
"use strict";

@@js

return QueryBuilder;

}));




