(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
  var container, graph, info, node, nodes, relationship, relationshipOutline, relationshipOverlay, relationshipText, relationships, selector, simulation, svg, svgNodes, svgRelationships, svgScale, svgTranslate,
  classes2colors = {},
  justLoaded = false,
  numClasses = 0,
  options = {
    arrowSize: 4,
    colors: colors(),
    highlight: undefined,
    iconMap: fontAwesomeIcons(),
    icons: undefined,
    imageMap: {},
    images: undefined,
    infoPanel: true,
    minCollision: undefined,
    neo4jData: undefined,
    neo4jDataUrl: undefined,
    nodeOutlineFillColor: undefined,
    nodeRadius: 25,
    relationshipColor: '#a5abb6',
    zoomFit: false
  },
  VERSION = '0.0.1';
  
  function appendGraph(container) {
    svg = container.append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'neo4jd3-graph')
      .call(d3.zoom().on('zoom', function() {
        var scale = d3.event.transform.k,
        translate = [d3.event.transform.x, d3.event.transform.y];

        if (svgTranslate) {
          translate[0] += svgTranslate[0];
          translate[1] += svgTranslate[1];
        }

        if (svgScale) {
          scale *= svgScale;
        }

        svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
      }))
      .on('dblclick.zoom', null)
      .append('g')
      .attr('width', '100%')
      .attr('height', '100%');
    
    svgRelationships = svg.append('g')
      .attr('class', 'relationships');
    
    svgNodes = svg.append('g')
      .attr('class', 'nodes');
  }
  
  function appendImageToNode(node) {
    return node.append('image')
      .attr('height', function(d) {
        return icon(d) ? '24px': '30px';
      })
      .attr('x', function(d) {
        return icon(d) ? '5px': '-15px';
      })
      .attr('xlink:href', function(d) {
        return image(d);
      })
      .attr('y', function(d) {
        return icon(d) ? '5px': '-16px';
      })
      .attr('width', function(d) {
        return icon(d) ? '24px': '30px';
      });
  }
  
  function appendInfoPanel(container) {
    return container.append('div')
      .attr('class', 'neo4jd3-info');
  }
  
  function appendInfoElement(cls, isNode, property, value) {
    var elem = info.append('a');
    
    elem.attr('href', '#')
      .attr('class', cls)
      .html('<strong>' + property + '</strong>' + (value ? (': ' + value) : ''));
    
    if (!value) {
      elem.style('background-color', function(d) {
        return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : (isNode ? class2color(property) : defaultColor());
      })
        .style('border-color', function(d) {
          return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : (isNode ? class2darkenColor(property) : defaultDarkenColor());
        })
        .style('color', function(d) {
          return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
        });
    }
  }
  
  function appendInfoElementClass(cls, node) {
    appendInfoElement(cls, true, node);
  }
  
  function appendInfoElementProperty(cls, property, value) {
    appendInfoElement(cls, false, property, value);
  }
  
  function appendInfoElementRelationship(cls, relationship) {
    appendInfoElement(cls, false, relationship);
  }
  
  function appendNode() {
    return node.enter()
      .append('g')
      .attr('class', function(d) {
        var highlight, i,
        classes = 'node',
        label = d.labels[0];
        
        if (icon(d)) {
          classes += ' node-icon';
        }
        
        if (image(d)) {
          classes += ' node-image';
        }
        
        if (options.highlight) {
          for (i = 0; i < options.highlight.length; i++) {
            highlight = options.highlight[i];
            
            if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
              classes += ' node-highlighted';
              break;
            }
          }
        }
        
        return classes;
      })
      .on('click', function(d) {
        d.fx = d.fy = null;
        
        if (typeof options.onNodeClick === 'function') {
          options.onNodeClick(d);
        }
      })
      .on('dblclick', function(d) {
        stickNode(d);
        
        if (typeof options.onNodeDoubleClick === 'function') {
          options.onNodeDoubleClick(d);
        }
      })
      .on('mouseenter', function(d) {
        if (info) {
          updateInfo(d);
        }
        
        if (typeof options.onNodeMouseEnter === 'function') {
          options.onNodeMouseEnter(d);
        }
      })
      .on('mouseleave', function(d) {
        if (info) {
          clearInfo(d);
        }
        
        if (typeof options.onNodeMouseLeave === 'function') {
          options.onNodeMouseLeave(d);
        }
      })
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));
  }
  
  function appendNodeToGraph() {
    var n = appendNode();
    
    appendRingToNode(n);
    appendOutlineToNode(n);

    if (options.icons) {
      appendTextToNode(n);
    }

    if (options.images) {
      appendImageToNode(n);
    }
    
    return n;
  }
  
  function appendOutlineToNode(node) {
    return node.append('circle')
      .attr('class', 'outline')
      .attr('r', options.nodeRadius)
      .style('fill', function(d) {
        return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
      })
      .style('stroke', function(d) {
        return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
      })
      .append('title').text(function(d) {
        return toString(d);
      });
  }
  
  function appendRingToNode(node) {
    return node.append('circle')
      .attr('class', 'ring')
      .attr('r', options.nodeRadius * 1.16)
      .append('title').text(function(d) {
        return toString(d);
      });
  }
  
  function appendTextToNode(node) {
    return node.append('text')
      .attr('class', function(d) {
        return 'text' + (icon(d) ? ' icon' : '');
      })
      .attr('fill', '#ffffff')
      .attr('font-size', function(d) {
        return icon(d) ? (options.nodeRadius + 'px') : '10px';
      })
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .attr('y', function(d) {
        return icon(d) ? (parseInt(Math.round(options.nodeRadius * 0.32)) + 'px') : '4px';
      })
      .html(function(d) {
        var _icon = icon(d);
        return _icon ? '&#x' + _icon : d.id;
      });
  }
  
  function appendRandomDataToNode(d, maxNodesToGenerate) {
    var data = randomD3Data(d, maxNodesToGenerate);
    updateWithNeo4jData(data);
  }
  
  function appendRelationship() {
    return relationship.enter()
      .append('g')
      .attr('class', 'relationship')
      .on('dblclick', function(d) {
        if (typeof options.onRelationshipDoubleClick === 'function') {
          options.onRelationshipDoubleClick(d);
        }
      })
      .on('mouseenter', function(d) {
        if (info) {
          updateInfo(d);
        }
      });
  }
  
  function appendOutlineToRelationship(r) {
    return r.append('path')
      .attr('class', 'outline')
      .attr('fill', '#a5abb6')
      .attr('stroke', 'none');
  }
  
  function appendOverlayToRelationship(r) {
    return r.append('path')
      .attr('class', 'overlay');
  }
  
  function appendTextToRelationship(r) {
    return r.append('text')
      .attr('class', 'text')
      .attr('fill', '#000000')
      .attr('font-size', '8px')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .text(function(d) {
        return d.type;
      });
  }
  
  function appendRelationshipToGraph() {
    var relationship = appendRelationship(),
    text = appendTextToRelationship(relationship),
    outline = appendOutlineToRelationship(relationship),
    overlay = appendOverlayToRelationship(relationship);
    
    return {
      outline: outline,
      overlay: overlay,
      relationship: relationship,
      text: text
    };
  }
  
  function class2color(cls) {
    var color = classes2colors[cls];
    
    if (!color) {
      //            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
      color = options.colors[numClasses % options.colors.length];
      classes2colors[cls] = color;
      numClasses++;
    }
    
    return color;
  }
  
  function class2darkenColor(cls) {
    return d3.rgb(class2color(cls)).darker(1);
  }
  
  function clearInfo() {
    info.html('');
  }
  
  function color() {
    return options.colors[options.colors.length * Math.random() << 0];
  }
  
  function colors() {
    // d3.schemeCategory10,
    // d3.schemeCategory20,
    return [
      '#68bdf6', // light blue
      '#6dce9e', // green #1
      '#faafc2', // light pink
      '#f2baf6', // purple
      '#ff928c', // light red
      '#fcea7e', // light yellow
      '#ffc766', // light orange
      '#405f9e', // navy blue
      '#a5abb6', // dark gray
      '#78cecb', // green #2,
      '#b88cbb', // dark purple
      '#ced2d9', // light gray
      '#e84646', // dark red
      '#fa5f86', // dark pink
      '#ffab1a', // dark orange
      '#fcda19', // dark yellow
      '#797b80', // black
      '#c9d96f', // pistacchio
      '#47991f', // green #3
      '#70edee', // turquoise
      '#ff75ea'  // pink
    ];
  }
  
  function contains(array, id) {
    var filter = array.filter(function(elem) {
      return elem.id === id;
    });
    
    return filter.length > 0;
  }
  
  function defaultColor() {
    return options.relationshipColor;
  }
  
  function defaultDarkenColor() {
    return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
  }
  
  function dragEnded(d) {
    if (!d3.event.active) {
      simulation.alphaTarget(0);
    }
    
    if (typeof options.onNodeDragEnd === 'function') {
      options.onNodeDragEnd(d);
    }
  }
  
  function dragged(d) {
    stickNode(d);
  }
  
  function dragStarted(d) {
    if (!d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    
    d.fx = d.x;
    d.fy = d.y;
    
    if (typeof options.onNodeDragStart === 'function') {
      options.onNodeDragStart(d);
    }
  }
  
  function extend(obj1, obj2) {
    var obj = {};
    
    merge(obj, obj1);
    merge(obj, obj2);
    
    return obj;
  }
  
  function fontAwesomeIcons() {
    return {'glass':'f000','music':'f001','search':'f002','envelope-o':'f003','heart':'f004','star':'f005','star-o':'f006','user':'f007','film':'f008','th-large':'f009','th':'f00a','th-list':'f00b','check':'f00c','remove,close,times':'f00d','search-plus':'f00e','search-minus':'f010','power-off':'f011','signal':'f012','gear,cog':'f013','trash-o':'f014','home':'f015','file-o':'f016','clock-o':'f017','road':'f018','download':'f019','arrow-circle-o-down':'f01a','arrow-circle-o-up':'f01b','inbox':'f01c','play-circle-o':'f01d','rotate-right,repeat':'f01e','refresh':'f021','list-alt':'f022','lock':'f023','flag':'f024','headphones':'f025','volume-off':'f026','volume-down':'f027','volume-up':'f028','qrcode':'f029','barcode':'f02a','tag':'f02b','tags':'f02c','book':'f02d','bookmark':'f02e','print':'f02f','camera':'f030','font':'f031','bold':'f032','italic':'f033','text-height':'f034','text-width':'f035','align-left':'f036','align-center':'f037','align-right':'f038','align-justify':'f039','list':'f03a','dedent,outdent':'f03b','indent':'f03c','video-camera':'f03d','photo,image,picture-o':'f03e','pencil':'f040','map-marker':'f041','adjust':'f042','tint':'f043','edit,pencil-square-o':'f044','share-square-o':'f045','check-square-o':'f046','arrows':'f047','step-backward':'f048','fast-backward':'f049','backward':'f04a','play':'f04b','pause':'f04c','stop':'f04d','forward':'f04e','fast-forward':'f050','step-forward':'f051','eject':'f052','chevron-left':'f053','chevron-right':'f054','plus-circle':'f055','minus-circle':'f056','times-circle':'f057','check-circle':'f058','question-circle':'f059','info-circle':'f05a','crosshairs':'f05b','times-circle-o':'f05c','check-circle-o':'f05d','ban':'f05e','arrow-left':'f060','arrow-right':'f061','arrow-up':'f062','arrow-down':'f063','mail-forward,share':'f064','expand':'f065','compress':'f066','plus':'f067','minus':'f068','asterisk':'f069','exclamation-circle':'f06a','gift':'f06b','leaf':'f06c','fire':'f06d','eye':'f06e','eye-slash':'f070','warning,exclamation-triangle':'f071','plane':'f072','calendar':'f073','random':'f074','comment':'f075','magnet':'f076','chevron-up':'f077','chevron-down':'f078','retweet':'f079','shopping-cart':'f07a','folder':'f07b','folder-open':'f07c','arrows-v':'f07d','arrows-h':'f07e','bar-chart-o,bar-chart':'f080','twitter-square':'f081','facebook-square':'f082','camera-retro':'f083','key':'f084','gears,cogs':'f085','comments':'f086','thumbs-o-up':'f087','thumbs-o-down':'f088','star-half':'f089','heart-o':'f08a','sign-out':'f08b','linkedin-square':'f08c','thumb-tack':'f08d','external-link':'f08e','sign-in':'f090','trophy':'f091','github-square':'f092','upload':'f093','lemon-o':'f094','phone':'f095','square-o':'f096','bookmark-o':'f097','phone-square':'f098','twitter':'f099','facebook-f,facebook':'f09a','github':'f09b','unlock':'f09c','credit-card':'f09d','feed,rss':'f09e','hdd-o':'f0a0','bullhorn':'f0a1','bell':'f0f3','certificate':'f0a3','hand-o-right':'f0a4','hand-o-left':'f0a5','hand-o-up':'f0a6','hand-o-down':'f0a7','arrow-circle-left':'f0a8','arrow-circle-right':'f0a9','arrow-circle-up':'f0aa','arrow-circle-down':'f0ab','globe':'f0ac','wrench':'f0ad','tasks':'f0ae','filter':'f0b0','briefcase':'f0b1','arrows-alt':'f0b2','group,users':'f0c0','chain,link':'f0c1','cloud':'f0c2','flask':'f0c3','cut,scissors':'f0c4','copy,files-o':'f0c5','paperclip':'f0c6','save,floppy-o':'f0c7','square':'f0c8','navicon,reorder,bars':'f0c9','list-ul':'f0ca','list-ol':'f0cb','strikethrough':'f0cc','underline':'f0cd','table':'f0ce','magic':'f0d0','truck':'f0d1','pinterest':'f0d2','pinterest-square':'f0d3','google-plus-square':'f0d4','google-plus':'f0d5','money':'f0d6','caret-down':'f0d7','caret-up':'f0d8','caret-left':'f0d9','caret-right':'f0da','columns':'f0db','unsorted,sort':'f0dc','sort-down,sort-desc':'f0dd','sort-up,sort-asc':'f0de','envelope':'f0e0','linkedin':'f0e1','rotate-left,undo':'f0e2','legal,gavel':'f0e3','dashboard,tachometer':'f0e4','comment-o':'f0e5','comments-o':'f0e6','flash,bolt':'f0e7','sitemap':'f0e8','umbrella':'f0e9','paste,clipboard':'f0ea','lightbulb-o':'f0eb','exchange':'f0ec','cloud-download':'f0ed','cloud-upload':'f0ee','user-md':'f0f0','stethoscope':'f0f1','suitcase':'f0f2','bell-o':'f0a2','coffee':'f0f4','cutlery':'f0f5','file-text-o':'f0f6','building-o':'f0f7','hospital-o':'f0f8','ambulance':'f0f9','medkit':'f0fa','fighter-jet':'f0fb','beer':'f0fc','h-square':'f0fd','plus-square':'f0fe','angle-double-left':'f100','angle-double-right':'f101','angle-double-up':'f102','angle-double-down':'f103','angle-left':'f104','angle-right':'f105','angle-up':'f106','angle-down':'f107','desktop':'f108','laptop':'f109','tablet':'f10a','mobile-phone,mobile':'f10b','circle-o':'f10c','quote-left':'f10d','quote-right':'f10e','spinner':'f110','circle':'f111','mail-reply,reply':'f112','github-alt':'f113','folder-o':'f114','folder-open-o':'f115','smile-o':'f118','frown-o':'f119','meh-o':'f11a','gamepad':'f11b','keyboard-o':'f11c','flag-o':'f11d','flag-checkered':'f11e','terminal':'f120','code':'f121','mail-reply-all,reply-all':'f122','star-half-empty,star-half-full,star-half-o':'f123','location-arrow':'f124','crop':'f125','code-fork':'f126','unlink,chain-broken':'f127','question':'f128','info':'f129','exclamation':'f12a','superscript':'f12b','subscript':'f12c','eraser':'f12d','puzzle-piece':'f12e','microphone':'f130','microphone-slash':'f131','shield':'f132','calendar-o':'f133','fire-extinguisher':'f134','rocket':'f135','maxcdn':'f136','chevron-circle-left':'f137','chevron-circle-right':'f138','chevron-circle-up':'f139','chevron-circle-down':'f13a','html5':'f13b','css3':'f13c','anchor':'f13d','unlock-alt':'f13e','bullseye':'f140','ellipsis-h':'f141','ellipsis-v':'f142','rss-square':'f143','play-circle':'f144','ticket':'f145','minus-square':'f146','minus-square-o':'f147','level-up':'f148','level-down':'f149','check-square':'f14a','pencil-square':'f14b','external-link-square':'f14c','share-square':'f14d','compass':'f14e','toggle-down,caret-square-o-down':'f150','toggle-up,caret-square-o-up':'f151','toggle-right,caret-square-o-right':'f152','euro,eur':'f153','gbp':'f154','dollar,usd':'f155','rupee,inr':'f156','cny,rmb,yen,jpy':'f157','ruble,rouble,rub':'f158','won,krw':'f159','bitcoin,btc':'f15a','file':'f15b','file-text':'f15c','sort-alpha-asc':'f15d','sort-alpha-desc':'f15e','sort-amount-asc':'f160','sort-amount-desc':'f161','sort-numeric-asc':'f162','sort-numeric-desc':'f163','thumbs-up':'f164','thumbs-down':'f165','youtube-square':'f166','youtube':'f167','xing':'f168','xing-square':'f169','youtube-play':'f16a','dropbox':'f16b','stack-overflow':'f16c','instagram':'f16d','flickr':'f16e','adn':'f170','bitbucket':'f171','bitbucket-square':'f172','tumblr':'f173','tumblr-square':'f174','long-arrow-down':'f175','long-arrow-up':'f176','long-arrow-left':'f177','long-arrow-right':'f178','apple':'f179','windows':'f17a','android':'f17b','linux':'f17c','dribbble':'f17d','skype':'f17e','foursquare':'f180','trello':'f181','female':'f182','male':'f183','gittip,gratipay':'f184','sun-o':'f185','moon-o':'f186','archive':'f187','bug':'f188','vk':'f189','weibo':'f18a','renren':'f18b','pagelines':'f18c','stack-exchange':'f18d','arrow-circle-o-right':'f18e','arrow-circle-o-left':'f190','toggle-left,caret-square-o-left':'f191','dot-circle-o':'f192','wheelchair':'f193','vimeo-square':'f194','turkish-lira,try':'f195','plus-square-o':'f196','space-shuttle':'f197','slack':'f198','envelope-square':'f199','wordpress':'f19a','openid':'f19b','institution,bank,university':'f19c','mortar-board,graduation-cap':'f19d','yahoo':'f19e','google':'f1a0','reddit':'f1a1','reddit-square':'f1a2','stumbleupon-circle':'f1a3','stumbleupon':'f1a4','delicious':'f1a5','digg':'f1a6','pied-piper-pp':'f1a7','pied-piper-alt':'f1a8','drupal':'f1a9','joomla':'f1aa','language':'f1ab','fax':'f1ac','building':'f1ad','child':'f1ae','paw':'f1b0','spoon':'f1b1','cube':'f1b2','cubes':'f1b3','behance':'f1b4','behance-square':'f1b5','steam':'f1b6','steam-square':'f1b7','recycle':'f1b8','automobile,car':'f1b9','cab,taxi':'f1ba','tree':'f1bb','spotify':'f1bc','deviantart':'f1bd','soundcloud':'f1be','database':'f1c0','file-pdf-o':'f1c1','file-word-o':'f1c2','file-excel-o':'f1c3','file-powerpoint-o':'f1c4','file-photo-o,file-picture-o,file-image-o':'f1c5','file-zip-o,file-archive-o':'f1c6','file-sound-o,file-audio-o':'f1c7','file-movie-o,file-video-o':'f1c8','file-code-o':'f1c9','vine':'f1ca','codepen':'f1cb','jsfiddle':'f1cc','life-bouy,life-buoy,life-saver,support,life-ring':'f1cd','circle-o-notch':'f1ce','ra,resistance,rebel':'f1d0','ge,empire':'f1d1','git-square':'f1d2','git':'f1d3','y-combinator-square,yc-square,hacker-news':'f1d4','tencent-weibo':'f1d5','qq':'f1d6','wechat,weixin':'f1d7','send,paper-plane':'f1d8','send-o,paper-plane-o':'f1d9','history':'f1da','circle-thin':'f1db','header':'f1dc','paragraph':'f1dd','sliders':'f1de','share-alt':'f1e0','share-alt-square':'f1e1','bomb':'f1e2','soccer-ball-o,futbol-o':'f1e3','tty':'f1e4','binoculars':'f1e5','plug':'f1e6','slideshare':'f1e7','twitch':'f1e8','yelp':'f1e9','newspaper-o':'f1ea','wifi':'f1eb','calculator':'f1ec','paypal':'f1ed','google-wallet':'f1ee','cc-visa':'f1f0','cc-mastercard':'f1f1','cc-discover':'f1f2','cc-amex':'f1f3','cc-paypal':'f1f4','cc-stripe':'f1f5','bell-slash':'f1f6','bell-slash-o':'f1f7','trash':'f1f8','copyright':'f1f9','at':'f1fa','eyedropper':'f1fb','paint-brush':'f1fc','birthday-cake':'f1fd','area-chart':'f1fe','pie-chart':'f200','line-chart':'f201','lastfm':'f202','lastfm-square':'f203','toggle-off':'f204','toggle-on':'f205','bicycle':'f206','bus':'f207','ioxhost':'f208','angellist':'f209','cc':'f20a','shekel,sheqel,ils':'f20b','meanpath':'f20c','buysellads':'f20d','connectdevelop':'f20e','dashcube':'f210','forumbee':'f211','leanpub':'f212','sellsy':'f213','shirtsinbulk':'f214','simplybuilt':'f215','skyatlas':'f216','cart-plus':'f217','cart-arrow-down':'f218','diamond':'f219','ship':'f21a','user-secret':'f21b','motorcycle':'f21c','street-view':'f21d','heartbeat':'f21e','venus':'f221','mars':'f222','mercury':'f223','intersex,transgender':'f224','transgender-alt':'f225','venus-double':'f226','mars-double':'f227','venus-mars':'f228','mars-stroke':'f229','mars-stroke-v':'f22a','mars-stroke-h':'f22b','neuter':'f22c','genderless':'f22d','facebook-official':'f230','pinterest-p':'f231','whatsapp':'f232','server':'f233','user-plus':'f234','user-times':'f235','hotel,bed':'f236','viacoin':'f237','train':'f238','subway':'f239','medium':'f23a','yc,y-combinator':'f23b','optin-monster':'f23c','opencart':'f23d','expeditedssl':'f23e','battery-4,battery-full':'f240','battery-3,battery-three-quarters':'f241','battery-2,battery-half':'f242','battery-1,battery-quarter':'f243','battery-0,battery-empty':'f244','mouse-pointer':'f245','i-cursor':'f246','object-group':'f247','object-ungroup':'f248','sticky-note':'f249','sticky-note-o':'f24a','cc-jcb':'f24b','cc-diners-club':'f24c','clone':'f24d','balance-scale':'f24e','hourglass-o':'f250','hourglass-1,hourglass-start':'f251','hourglass-2,hourglass-half':'f252','hourglass-3,hourglass-end':'f253','hourglass':'f254','hand-grab-o,hand-rock-o':'f255','hand-stop-o,hand-paper-o':'f256','hand-scissors-o':'f257','hand-lizard-o':'f258','hand-spock-o':'f259','hand-pointer-o':'f25a','hand-peace-o':'f25b','trademark':'f25c','registered':'f25d','creative-commons':'f25e','gg':'f260','gg-circle':'f261','tripadvisor':'f262','odnoklassniki':'f263','odnoklassniki-square':'f264','get-pocket':'f265','wikipedia-w':'f266','safari':'f267','chrome':'f268','firefox':'f269','opera':'f26a','internet-explorer':'f26b','tv,television':'f26c','contao':'f26d','500px':'f26e','amazon':'f270','calendar-plus-o':'f271','calendar-minus-o':'f272','calendar-times-o':'f273','calendar-check-o':'f274','industry':'f275','map-pin':'f276','map-signs':'f277','map-o':'f278','map':'f279','commenting':'f27a','commenting-o':'f27b','houzz':'f27c','vimeo':'f27d','black-tie':'f27e','fonticons':'f280','reddit-alien':'f281','edge':'f282','credit-card-alt':'f283','codiepie':'f284','modx':'f285','fort-awesome':'f286','usb':'f287','product-hunt':'f288','mixcloud':'f289','scribd':'f28a','pause-circle':'f28b','pause-circle-o':'f28c','stop-circle':'f28d','stop-circle-o':'f28e','shopping-bag':'f290','shopping-basket':'f291','hashtag':'f292','bluetooth':'f293','bluetooth-b':'f294','percent':'f295','gitlab':'f296','wpbeginner':'f297','wpforms':'f298','envira':'f299','universal-access':'f29a','wheelchair-alt':'f29b','question-circle-o':'f29c','blind':'f29d','audio-description':'f29e','volume-control-phone':'f2a0','braille':'f2a1','assistive-listening-systems':'f2a2','asl-interpreting,american-sign-language-interpreting':'f2a3','deafness,hard-of-hearing,deaf':'f2a4','glide':'f2a5','glide-g':'f2a6','signing,sign-language':'f2a7','low-vision':'f2a8','viadeo':'f2a9','viadeo-square':'f2aa','snapchat':'f2ab','snapchat-ghost':'f2ac','snapchat-square':'f2ad','pied-piper':'f2ae','first-order':'f2b0','yoast':'f2b1','themeisle':'f2b2','google-plus-circle,google-plus-official':'f2b3','fa,font-awesome':'f2b4'};
    }
    
    function icon(d) {
      var code;
      
      if (options.iconMap && options.showIcons && options.icons) {
        if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
          code = options.iconMap[options.icons[d.labels[0]]];
        } else if (options.iconMap[d.labels[0]]) {
          code = options.iconMap[d.labels[0]];
        } else if (options.icons[d.labels[0]]) {
          code = options.icons[d.labels[0]];
        }
      }
      
      return code;
    }

function image(d) {
  var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;
  
  if (options.images) {
    imagesForLabel = options.imageMap[d.labels[0]];
    
    if (imagesForLabel) {
      imgLevel = 0;
      
      for (i = 0; i < imagesForLabel.length; i++) {
        labelPropertyValue = imagesForLabel[i].split('|');
        
        switch (labelPropertyValue.length) {
          case 3:
            value = labelPropertyValue[2];
            /* falls through */
          case 2:
            property = labelPropertyValue[1];
            /* falls through */
          case 1:
            label = labelPropertyValue[0];
        }
        
        if (d.labels[0] === label &&
          (!property || d.properties[property] !== undefined) &&
          (!value || d.properties[property] === value)) {
          if (labelPropertyValue.length > imgLevel) {
            img = options.images[imagesForLabel[i]];
            imgLevel = labelPropertyValue.length;
          }
        }
      }
    }
  }
  
  return img;
}

function init(_selector, _options) {
  initIconMap();
  
  merge(options, _options);
  
  if (options.icons) {
    options.showIcons = true;
  }
  
  if (!options.minCollision) {
    options.minCollision = options.nodeRadius * 2;
  }
  
  initImageMap();
  
  selector = _selector;
  
  container = d3.select(selector);
  
  container.attr('class', 'neo4jd3')
    .html('');
  
  if (options.infoPanel) {
    info = appendInfoPanel(container);
  }
  
  appendGraph(container);
  
  simulation = initSimulation();
  
  if (options.neo4jData) {
    loadNeo4jData(options.neo4jData);
  } else if (options.neo4jDataUrl) {
    loadNeo4jDataFromUrl(options.neo4jDataUrl);
  } else {
    console.error('Error: both neo4jData and neo4jDataUrl are empty!');
  }
}

function initIconMap() {
  Object.keys(options.iconMap).forEach(function(key, index) {
    var keys = key.split(','),
    value = options.iconMap[key];
    
    keys.forEach(function(key) {
      options.iconMap[key] = value;
    });
  });
}

function initImageMap() {
  var key, keys, selector;
  
  for (key in options.images) {
    if (options.images.hasOwnProperty(key)) {
      keys = key.split('|');

      if (!options.imageMap[keys[0]]) {
        options.imageMap[keys[0]] = [key];
      } else {
        options.imageMap[keys[0]].push(key);
      }
    }
  }
}

function initSimulation() {
  var simulation = d3.forceSimulation()
  //                           .velocityDecay(0.8)
  //                           .force('x', d3.force().strength(0.002))
  //                           .force('y', d3.force().strength(0.002))
    .force('collide', d3.forceCollide().radius(function(d) {
      return options.minCollision;
    }).iterations(2))
    .force('charge', d3.forceManyBody())
    .force('link', d3.forceLink().id(function(d) {
      return d.id;
    }))
    .force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2))
    .on('tick', function() {
      tick();
    })
    .on('end', function() {
      if (options.zoomFit && !justLoaded) {
        justLoaded = true;
        zoomFit(2);
      }
    });
  
  return simulation;
}

function loadNeo4jData() {
  nodes = [];
  relationships = [];
  
  updateWithNeo4jData(options.neo4jData);
}

function loadNeo4jDataFromUrl(neo4jDataUrl) {
  nodes = [];
  relationships = [];
  
  d3.json(neo4jDataUrl, function(error, data) {
    if (error) {
      throw error;
    }
    
    updateWithNeo4jData(data);
  });
}

function merge(target, source) {
  Object.keys(source).forEach(function(property) {
    target[property] = source[property];
  });
}

function neo4jDataToD3Data(data) {
  var graph = {
    nodes: [],
    relationships: []
  };
  
  data.results.forEach(function(result) {
    result.data.forEach(function(data) {
      data.graph.nodes.forEach(function(node) {
        if (!contains(graph.nodes, node.id)) {
          graph.nodes.push(node);
        }
      });
      
      data.graph.relationships.forEach(function(relationship) {
        relationship.source = relationship.startNode;
        relationship.target = relationship.endNode;
        graph.relationships.push(relationship);
      });
      
      data.graph.relationships.sort(function(a, b) {
        if (a.source > b.source) {
          return 1;
        } else if (a.source < b.source) {
          return -1;
        } else {
          if (a.target > b.target) {
            return 1;
          }
          
          if (a.target < b.target) {
            return -1;
          } else {
            return 0;
          }
        }
      });
      
      for (var i = 0; i < data.graph.relationships.length; i++) {
        if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i-1].source && data.graph.relationships[i].target === data.graph.relationships[i-1].target) {
          data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
        } else {
          data.graph.relationships[i].linknum = 1;
        }
      }
    });
  });
  
  return graph;
}

function randomD3Data(d, maxNodesToGenerate) {
  var data = {
    nodes: [],
    relationships: []
  },
  i,
  label,
  node,
  numNodes = (maxNodesToGenerate * Math.random() << 0) + 1,
  relationship,
  s = size();
  
  for (i = 0; i < numNodes; i++) {
    label = randomLabel();
    
    node = {
      id: s.nodes + 1 + i,
      labels: [label],
      properties: {
        random: label
      },
      x: d.x,
      y: d.y
    };
    
    data.nodes[data.nodes.length] = node;
    
    relationship = {
      id: s.relationships + 1 + i,
      type: label.toUpperCase(),
      startNode: d.id,
      endNode: s.nodes + 1 + i,
      properties: {
        from: Date.now()
      },
      source: d.id,
      target: s.nodes + 1 + i,
      linknum: s.relationships + 1 + i
    };
    
    data.relationships[data.relationships.length] = relationship;
  }
  
  return data;
}

function randomLabel() {
  var icons = Object.keys(options.iconMap);
  return icons[icons.length * Math.random() << 0];
}

function rotate(cx, cy, x, y, angle) {
  var radians = (Math.PI / 180) * angle,
  cos = Math.cos(radians),
  sin = Math.sin(radians),
  nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
  ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
  
  return { x: nx, y: ny };
}

function rotatePoint(c, p, angle) {
  return rotate(c.x, c.y, p.x, p.y, angle);
}

function rotation(source, target) {
  return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
}

function size() {
  return {
    nodes: nodes.length,
    relationships: relationships.length
  };
}
/*
    function smoothTransform(elem, translate, scale) {
        var animationMilliseconds = 5000,
            timeoutMilliseconds = 50,
            steps = parseInt(animationMilliseconds / timeoutMilliseconds);

        setTimeout(function() {
            smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
        }, timeoutMilliseconds);
    }

    function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
        var progress = step / steps;

        elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');

        if (step < steps) {
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
            }, timeoutMilliseconds);
        }
    }
    */
function stickNode(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function tick() {
  tickNodes();
  tickRelationships();
}

function tickNodes() {
  if (node) {
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ', ' + d.y + ')';
    });
  }
}

function tickRelationships() {
  if (relationship) {
    relationship.attr('transform', function(d) {
      var angle = rotation(d.source, d.target);
      return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
    });
    
    tickRelationshipsTexts();
    tickRelationshipsOutlines();
    tickRelationshipsOverlays();
  }
}

function tickRelationshipsOutlines() {
  relationship.each(function(relationship) {
    var rel = d3.select(this),
    outline = rel.select('.outline'),
    text = rel.select('.text'),
    bbox = text.node().getBBox(),
    padding = 3;
    
    outline.attr('d', function(d) {
      var center = { x: 0, y: 0 },
      angle = rotation(d.source, d.target),
      textBoundingBox = text.node().getBBox(),
      textPadding = 5,
      u = unitaryVector(d.source, d.target),
      textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
      n = unitaryNormalVector(d.source, d.target),
      rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
      rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
      rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
      rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
      rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
      rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
      rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
      rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
      rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (- n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (- n.y - u.y) * options.arrowSize }, angle),
      rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
      rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);
      
      return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y +
      ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y +
      ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y +
      ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y +
      ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y +
      ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y +
      ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y +
      ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y +
      ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y +
      ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y +
      ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y +
      ' Z';
    });
  });
}

function tickRelationshipsOverlays() {
  relationshipOverlay.attr('d', function(d) {
    var center = { x: 0, y: 0 },
    angle = rotation(d.source, d.target),
    n1 = unitaryNormalVector(d.source, d.target),
    n = unitaryNormalVector(d.source, d.target, 50),
    rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
    rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
    rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
    rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);
    
    return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y +
    ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y +
    ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y +
    ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y +
    ' Z';
  });
}

function tickRelationshipsTexts() {
  relationshipText.attr('transform', function(d) {
    var angle = (rotation(d.source, d.target) + 360) % 360,
    mirror = angle > 90 && angle < 270,
    center = { x: 0, y: 0 },
    n = unitaryNormalVector(d.source, d.target),
    nWeight = mirror ? 2 : -3,
    point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
    rotatedPoint = rotatePoint(center, point, angle);
    
    return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
  });
}

function toString(d) {
  var s = d.labels ? d.labels[0] : d.type;
  
  s += ' (<id>: ' + d.id;
  
  Object.keys(d.properties).forEach(function(property) {
    s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
  });
  
  s += ')';
  
  return s;
}

function unitaryNormalVector(source, target, newLength) {
  var center = { x: 0, y: 0 },
  vector = unitaryVector(source, target, newLength);
  
  return rotatePoint(center, vector, 90);
}

function unitaryVector(source, target, newLength) {
  var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);
  
  return {
    x: (target.x - source.x) / length,
    y: (target.y - source.y) / length,
  };
}

function updateWithD3Data(d3Data) {
  updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
}

function updateWithNeo4jData(neo4jData) {
  var d3Data = neo4jDataToD3Data(neo4jData);
  updateWithD3Data(d3Data);
}

function updateInfo(d) {
  clearInfo();
  
  if (d.labels) {
    appendInfoElementClass('class', d.labels[0]);
  } else {
    appendInfoElementRelationship('class', d.type);
  }
  
  appendInfoElementProperty('property', '&lt;id&gt;', d.id);
  
  Object.keys(d.properties).forEach(function(property) {
    appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
  });
}

function updateNodes(n) {
  Array.prototype.push.apply(nodes, n);
  
  node = svgNodes.selectAll('.node')
    .data(nodes, function(d) { return d.id; });
  var nodeEnter = appendNodeToGraph();
  node = nodeEnter.merge(node);
}

function updateNodesAndRelationships(n, r) {
  updateRelationships(r);
  updateNodes(n);
  
  simulation.nodes(nodes);
  simulation.force('link').links(relationships);
}

function updateRelationships(r) {
  Array.prototype.push.apply(relationships, r);
  
  relationship = svgRelationships.selectAll('.relationship')
    .data(relationships, function(d) { return d.id; });
  
  var relationshipEnter = appendRelationshipToGraph();
  
  relationship = relationshipEnter.relationship.merge(relationship);
  
  relationshipOutline = svg.selectAll('.relationship .outline');
  relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);
  
  relationshipOverlay = svg.selectAll('.relationship .overlay');
  relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);
  
  relationshipText = svg.selectAll('.relationship .text');
  relationshipText = relationshipEnter.text.merge(relationshipText);
}

function version() {
  return VERSION;
}

function zoomFit(transitionDuration) {
  var bounds = svg.node().getBBox(),
  parent = svg.node().parentElement.parentElement,
  fullWidth = parent.clientWidth,
  fullHeight = parent.clientHeight,
  width = bounds.width,
  height = bounds.height,
  midX = bounds.x + width / 2,
  midY = bounds.y + height / 2;
  
  if (width === 0 || height === 0) {
    return; // nothing to fit
  }
  
  svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
  svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];
  
  svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
  //        smoothTransform(svgTranslate, svgScale);
}

init(_selector, _options);

return {
  appendRandomDataToNode: appendRandomDataToNode,
  neo4jDataToD3Data: neo4jDataToD3Data,
  randomD3Data: randomD3Data,
  size: size,
  updateWithD3Data: updateWithD3Data,
  updateWithNeo4jData: updateWithNeo4jData,
  version: version
};
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5lbzRqZDMgPSByZXF1aXJlKCcuL3NjcmlwdHMvbmVvNGpkMycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5lbzRqZDM7XG4iLCIvKiBnbG9iYWwgZDMsIGRvY3VtZW50ICovXG4vKiBqc2hpbnQgbGF0ZWRlZjpub2Z1bmMgKi9cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTmVvNGpEMyhfc2VsZWN0b3IsIF9vcHRpb25zKSB7XG4gIHZhciBjb250YWluZXIsIGdyYXBoLCBpbmZvLCBub2RlLCBub2RlcywgcmVsYXRpb25zaGlwLCByZWxhdGlvbnNoaXBPdXRsaW5lLCByZWxhdGlvbnNoaXBPdmVybGF5LCByZWxhdGlvbnNoaXBUZXh0LCByZWxhdGlvbnNoaXBzLCBzZWxlY3Rvciwgc2ltdWxhdGlvbiwgc3ZnLCBzdmdOb2Rlcywgc3ZnUmVsYXRpb25zaGlwcywgc3ZnU2NhbGUsIHN2Z1RyYW5zbGF0ZSxcbiAgY2xhc3NlczJjb2xvcnMgPSB7fSxcbiAganVzdExvYWRlZCA9IGZhbHNlLFxuICBudW1DbGFzc2VzID0gMCxcbiAgb3B0aW9ucyA9IHtcbiAgICBhcnJvd1NpemU6IDQsXG4gICAgY29sb3JzOiBjb2xvcnMoKSxcbiAgICBoaWdobGlnaHQ6IHVuZGVmaW5lZCxcbiAgICBpY29uTWFwOiBmb250QXdlc29tZUljb25zKCksXG4gICAgaWNvbnM6IHVuZGVmaW5lZCxcbiAgICBpbWFnZU1hcDoge30sXG4gICAgaW1hZ2VzOiB1bmRlZmluZWQsXG4gICAgaW5mb1BhbmVsOiB0cnVlLFxuICAgIG1pbkNvbGxpc2lvbjogdW5kZWZpbmVkLFxuICAgIG5lbzRqRGF0YTogdW5kZWZpbmVkLFxuICAgIG5lbzRqRGF0YVVybDogdW5kZWZpbmVkLFxuICAgIG5vZGVPdXRsaW5lRmlsbENvbG9yOiB1bmRlZmluZWQsXG4gICAgbm9kZVJhZGl1czogMjUsXG4gICAgcmVsYXRpb25zaGlwQ29sb3I6ICcjYTVhYmI2JyxcbiAgICB6b29tRml0OiBmYWxzZVxuICB9LFxuICBWRVJTSU9OID0gJzAuMC4xJztcbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZEdyYXBoKGNvbnRhaW5lcikge1xuICAgIHN2ZyA9IGNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXG4gICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG4gICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtZ3JhcGgnKVxuICAgICAgLmNhbGwoZDMuem9vbSgpLm9uKCd6b29tJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzY2FsZSA9IGQzLmV2ZW50LnRyYW5zZm9ybS5rLFxuICAgICAgICB0cmFuc2xhdGUgPSBbZDMuZXZlbnQudHJhbnNmb3JtLngsIGQzLmV2ZW50LnRyYW5zZm9ybS55XTtcblxuICAgICAgICBpZiAoc3ZnVHJhbnNsYXRlKSB7XG4gICAgICAgICAgdHJhbnNsYXRlWzBdICs9IHN2Z1RyYW5zbGF0ZVswXTtcbiAgICAgICAgICB0cmFuc2xhdGVbMV0gKz0gc3ZnVHJhbnNsYXRlWzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN2Z1NjYWxlKSB7XG4gICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XG4gICAgICAgIH1cblxuICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdHJhbnNsYXRlWzBdICsgJywgJyArIHRyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzY2FsZSArICcpJyk7XG4gICAgICB9KSlcbiAgICAgIC5vbignZGJsY2xpY2suem9vbScsIG51bGwpXG4gICAgICAuYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcbiAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMTAwJScpO1xuICAgIFxuICAgIHN2Z1JlbGF0aW9uc2hpcHMgPSBzdmcuYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdyZWxhdGlvbnNoaXBzJyk7XG4gICAgXG4gICAgc3ZnTm9kZXMgPSBzdmcuYXBwZW5kKCdnJylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdub2RlcycpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRJbWFnZVRvTm9kZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdpbWFnZScpXG4gICAgICAuYXR0cignaGVpZ2h0JywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JzogJzMwcHgnO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICc1cHgnOiAnLTE1cHgnO1xuICAgICAgfSlcbiAgICAgIC5hdHRyKCd4bGluazpocmVmJywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaW1hZ2UoZCk7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3knLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6ICctMTZweCc7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JzogJzMwcHgnO1xuICAgICAgfSk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZEluZm9QYW5lbChjb250YWluZXIpIHtcbiAgICByZXR1cm4gY29udGFpbmVyLmFwcGVuZCgnZGl2JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnQoY2xzLCBpc05vZGUsIHByb3BlcnR5LCB2YWx1ZSkge1xuICAgIHZhciBlbGVtID0gaW5mby5hcHBlbmQoJ2EnKTtcbiAgICBcbiAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXG4gICAgICAuYXR0cignY2xhc3MnLCBjbHMpXG4gICAgICAuaHRtbCgnPHN0cm9uZz4nICsgcHJvcGVydHkgKyAnPC9zdHJvbmc+JyArICh2YWx1ZSA/ICgnOiAnICsgdmFsdWUpIDogJycpKTtcbiAgICBcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICBlbGVtLnN0eWxlKCdiYWNrZ3JvdW5kLWNvbG9yJywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiAoaXNOb2RlID8gY2xhc3MyY29sb3IocHJvcGVydHkpIDogZGVmYXVsdENvbG9yKCkpO1xuICAgICAgfSlcbiAgICAgICAgLnN0eWxlKCdib3JkZXItY29sb3InLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IChpc05vZGUgPyBjbGFzczJkYXJrZW5Db2xvcihwcm9wZXJ0eSkgOiBkZWZhdWx0RGFya2VuQ29sb3IoKSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6ICcjZmZmJztcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudENsYXNzKGNscywgbm9kZSkge1xuICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgdHJ1ZSwgbm9kZSk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZEluZm9FbGVtZW50UHJvcGVydHkoY2xzLCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcChjbHMsIHJlbGF0aW9uc2hpcCkge1xuICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHJlbGF0aW9uc2hpcCk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZE5vZGUoKSB7XG4gICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHZhciBoaWdobGlnaHQsIGksXG4gICAgICAgIGNsYXNzZXMgPSAnbm9kZScsXG4gICAgICAgIGxhYmVsID0gZC5sYWJlbHNbMF07XG4gICAgICAgIFxuICAgICAgICBpZiAoaWNvbihkKSkge1xuICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWljb24nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoaW1hZ2UoZCkpIHtcbiAgICAgICAgICBjbGFzc2VzICs9ICcgbm9kZS1pbWFnZSc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChvcHRpb25zLmhpZ2hsaWdodCkge1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRpb25zLmhpZ2hsaWdodC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaGlnaGxpZ2h0ID0gb3B0aW9ucy5oaWdobGlnaHRbaV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gaGlnaGxpZ2h0LmNsYXNzICYmIGQucHJvcGVydGllc1toaWdobGlnaHQucHJvcGVydHldID09PSBoaWdobGlnaHQudmFsdWUpIHtcbiAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaGlnaGxpZ2h0ZWQnO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjbGFzc2VzO1xuICAgICAgfSlcbiAgICAgIC5vbignY2xpY2snLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIGQuZnggPSBkLmZ5ID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG9wdGlvbnMub25Ob2RlQ2xpY2soZCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xuICAgICAgICBzdGlja05vZGUoZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrKGQpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyKGQpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgIGNsZWFySW5mbyhkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUoZCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2FsbChkMy5kcmFnKClcbiAgICAgICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxuICAgICAgICAub24oJ2RyYWcnLCBkcmFnZ2VkKVxuICAgICAgICAub24oJ2VuZCcsIGRyYWdFbmRlZCkpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmROb2RlVG9HcmFwaCgpIHtcbiAgICB2YXIgbiA9IGFwcGVuZE5vZGUoKTtcbiAgICBcbiAgICBhcHBlbmRSaW5nVG9Ob2RlKG4pO1xuICAgIGFwcGVuZE91dGxpbmVUb05vZGUobik7XG5cbiAgICBpZiAob3B0aW9ucy5pY29ucykge1xuICAgICAgYXBwZW5kVGV4dFRvTm9kZShuKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcbiAgICAgIGFwcGVuZEltYWdlVG9Ob2RlKG4pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbjtcbiAgfVxuICBcbiAgZnVuY3Rpb24gYXBwZW5kT3V0bGluZVRvTm9kZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxuICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMpXG4gICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA6IGNsYXNzMmNvbG9yKGQubGFiZWxzWzBdKTtcbiAgICAgIH0pXG4gICAgICAuc3R5bGUoJ3N0cm9rZScsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6IGNsYXNzMmRhcmtlbkNvbG9yKGQubGFiZWxzWzBdKTtcbiAgICAgIH0pXG4gICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XG4gICAgICB9KTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gYXBwZW5kUmluZ1RvTm9kZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgLmF0dHIoJ2NsYXNzJywgJ3JpbmcnKVxuICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMgKiAxLjE2KVxuICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIHRvU3RyaW5nKGQpO1xuICAgICAgfSk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZFRleHRUb05vZGUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIHJldHVybiAndGV4dCcgKyAoaWNvbihkKSA/ICcgaWNvbicgOiAnJyk7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ2ZpbGwnLCAnI2ZmZmZmZicpXG4gICAgICAuYXR0cignZm9udC1zaXplJywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaWNvbihkKSA/IChvcHRpb25zLm5vZGVSYWRpdXMgKyAncHgnKSA6ICcxMHB4JztcbiAgICAgIH0pXG4gICAgICAuYXR0cigncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gaWNvbihkKSA/IChwYXJzZUludChNYXRoLnJvdW5kKG9wdGlvbnMubm9kZVJhZGl1cyAqIDAuMzIpKSArICdweCcpIDogJzRweCc7XG4gICAgICB9KVxuICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xuICAgICAgICB2YXIgX2ljb24gPSBpY29uKGQpO1xuICAgICAgICByZXR1cm4gX2ljb24gPyAnJiN4JyArIF9pY29uIDogZC5pZDtcbiAgICAgIH0pO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xuICAgIHZhciBkYXRhID0gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSk7XG4gICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gYXBwZW5kUmVsYXRpb25zaGlwKCkge1xuICAgIHJldHVybiByZWxhdGlvbnNoaXAuZW50ZXIoKVxuICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwJylcbiAgICAgIC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihkKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrKGQpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCkge1xuICAgICAgICBpZiAoaW5mbykge1xuICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRPdXRsaW5lVG9SZWxhdGlvbnNoaXAocikge1xuICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnb3V0bGluZScpXG4gICAgICAuYXR0cignZmlsbCcsICcjYTVhYmI2JylcbiAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRPdmVybGF5VG9SZWxhdGlvbnNoaXAocikge1xuICAgIHJldHVybiByLmFwcGVuZCgncGF0aCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAnb3ZlcmxheScpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocikge1xuICAgIHJldHVybiByLmFwcGVuZCgndGV4dCcpXG4gICAgICAuYXR0cignY2xhc3MnLCAndGV4dCcpXG4gICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcbiAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnOHB4JylcbiAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gZC50eXBlO1xuICAgICAgfSk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKSB7XG4gICAgdmFyIHJlbGF0aW9uc2hpcCA9IGFwcGVuZFJlbGF0aW9uc2hpcCgpLFxuICAgIHRleHQgPSBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKSxcbiAgICBvdXRsaW5lID0gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXG4gICAgb3ZlcmxheSA9IGFwcGVuZE92ZXJsYXlUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBvdXRsaW5lOiBvdXRsaW5lLFxuICAgICAgb3ZlcmxheTogb3ZlcmxheSxcbiAgICAgIHJlbGF0aW9uc2hpcDogcmVsYXRpb25zaGlwLFxuICAgICAgdGV4dDogdGV4dFxuICAgIH07XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGNsYXNzMmNvbG9yKGNscykge1xuICAgIHZhciBjb2xvciA9IGNsYXNzZXMyY29sb3JzW2Nsc107XG4gICAgXG4gICAgaWYgKCFjb2xvcikge1xuICAgICAgLy8gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW01hdGgubWluKG51bUNsYXNzZXMsIG9wdGlvbnMuY29sb3JzLmxlbmd0aCAtIDEpXTtcbiAgICAgIGNvbG9yID0gb3B0aW9ucy5jb2xvcnNbbnVtQ2xhc3NlcyAlIG9wdGlvbnMuY29sb3JzLmxlbmd0aF07XG4gICAgICBjbGFzc2VzMmNvbG9yc1tjbHNdID0gY29sb3I7XG4gICAgICBudW1DbGFzc2VzKys7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBjb2xvcjtcbiAgfVxuICBcbiAgZnVuY3Rpb24gY2xhc3MyZGFya2VuQ29sb3IoY2xzKSB7XG4gICAgcmV0dXJuIGQzLnJnYihjbGFzczJjb2xvcihjbHMpKS5kYXJrZXIoMSk7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGNsZWFySW5mbygpIHtcbiAgICBpbmZvLmh0bWwoJycpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBjb2xvcigpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoICogTWF0aC5yYW5kb20oKSA8PCAwXTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gY29sb3JzKCkge1xuICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MTAsXG4gICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkyMCxcbiAgICByZXR1cm4gW1xuICAgICAgJyM2OGJkZjYnLCAvLyBsaWdodCBibHVlXG4gICAgICAnIzZkY2U5ZScsIC8vIGdyZWVuICMxXG4gICAgICAnI2ZhYWZjMicsIC8vIGxpZ2h0IHBpbmtcbiAgICAgICcjZjJiYWY2JywgLy8gcHVycGxlXG4gICAgICAnI2ZmOTI4YycsIC8vIGxpZ2h0IHJlZFxuICAgICAgJyNmY2VhN2UnLCAvLyBsaWdodCB5ZWxsb3dcbiAgICAgICcjZmZjNzY2JywgLy8gbGlnaHQgb3JhbmdlXG4gICAgICAnIzQwNWY5ZScsIC8vIG5hdnkgYmx1ZVxuICAgICAgJyNhNWFiYjYnLCAvLyBkYXJrIGdyYXlcbiAgICAgICcjNzhjZWNiJywgLy8gZ3JlZW4gIzIsXG4gICAgICAnI2I4OGNiYicsIC8vIGRhcmsgcHVycGxlXG4gICAgICAnI2NlZDJkOScsIC8vIGxpZ2h0IGdyYXlcbiAgICAgICcjZTg0NjQ2JywgLy8gZGFyayByZWRcbiAgICAgICcjZmE1Zjg2JywgLy8gZGFyayBwaW5rXG4gICAgICAnI2ZmYWIxYScsIC8vIGRhcmsgb3JhbmdlXG4gICAgICAnI2ZjZGExOScsIC8vIGRhcmsgeWVsbG93XG4gICAgICAnIzc5N2I4MCcsIC8vIGJsYWNrXG4gICAgICAnI2M5ZDk2ZicsIC8vIHBpc3RhY2NoaW9cbiAgICAgICcjNDc5OTFmJywgLy8gZ3JlZW4gIzNcbiAgICAgICcjNzBlZGVlJywgLy8gdHVycXVvaXNlXG4gICAgICAnI2ZmNzVlYScgIC8vIHBpbmtcbiAgICBdO1xuICB9XG4gIFxuICBmdW5jdGlvbiBjb250YWlucyhhcnJheSwgaWQpIHtcbiAgICB2YXIgZmlsdGVyID0gYXJyYXkuZmlsdGVyKGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgIHJldHVybiBlbGVtLmlkID09PSBpZDtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gZmlsdGVyLmxlbmd0aCA+IDA7XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGRlZmF1bHRDb2xvcigpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5yZWxhdGlvbnNoaXBDb2xvcjtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZGVmYXVsdERhcmtlbkNvbG9yKCkge1xuICAgIHJldHVybiBkMy5yZ2Iob3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMV0pLmRhcmtlcigxKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZHJhZ0VuZGVkKGQpIHtcbiAgICBpZiAoIWQzLmV2ZW50LmFjdGl2ZSkge1xuICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdFbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG9wdGlvbnMub25Ob2RlRHJhZ0VuZChkKTtcbiAgICB9XG4gIH1cbiAgXG4gIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xuICAgIHN0aWNrTm9kZShkKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZHJhZ1N0YXJ0ZWQoZCkge1xuICAgIGlmICghZDMuZXZlbnQuYWN0aXZlKSB7XG4gICAgICBzaW11bGF0aW9uLmFscGhhVGFyZ2V0KDAuMykucmVzdGFydCgpO1xuICAgIH1cbiAgICBcbiAgICBkLmZ4ID0gZC54O1xuICAgIGQuZnkgPSBkLnk7XG4gICAgXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdTdGFydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgb3B0aW9ucy5vbk5vZGVEcmFnU3RhcnQoZCk7XG4gICAgfVxuICB9XG4gIFxuICBmdW5jdGlvbiBleHRlbmQob2JqMSwgb2JqMikge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICBcbiAgICBtZXJnZShvYmosIG9iajEpO1xuICAgIG1lcmdlKG9iaiwgb2JqMik7XG4gICAgXG4gICAgcmV0dXJuIG9iajtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZm9udEF3ZXNvbWVJY29ucygpIHtcbiAgICByZXR1cm4geydnbGFzcyc6J2YwMDAnLCdtdXNpYyc6J2YwMDEnLCdzZWFyY2gnOidmMDAyJywnZW52ZWxvcGUtbyc6J2YwMDMnLCdoZWFydCc6J2YwMDQnLCdzdGFyJzonZjAwNScsJ3N0YXItbyc6J2YwMDYnLCd1c2VyJzonZjAwNycsJ2ZpbG0nOidmMDA4JywndGgtbGFyZ2UnOidmMDA5JywndGgnOidmMDBhJywndGgtbGlzdCc6J2YwMGInLCdjaGVjayc6J2YwMGMnLCdyZW1vdmUsY2xvc2UsdGltZXMnOidmMDBkJywnc2VhcmNoLXBsdXMnOidmMDBlJywnc2VhcmNoLW1pbnVzJzonZjAxMCcsJ3Bvd2VyLW9mZic6J2YwMTEnLCdzaWduYWwnOidmMDEyJywnZ2Vhcixjb2cnOidmMDEzJywndHJhc2gtbyc6J2YwMTQnLCdob21lJzonZjAxNScsJ2ZpbGUtbyc6J2YwMTYnLCdjbG9jay1vJzonZjAxNycsJ3JvYWQnOidmMDE4JywnZG93bmxvYWQnOidmMDE5JywnYXJyb3ctY2lyY2xlLW8tZG93bic6J2YwMWEnLCdhcnJvdy1jaXJjbGUtby11cCc6J2YwMWInLCdpbmJveCc6J2YwMWMnLCdwbGF5LWNpcmNsZS1vJzonZjAxZCcsJ3JvdGF0ZS1yaWdodCxyZXBlYXQnOidmMDFlJywncmVmcmVzaCc6J2YwMjEnLCdsaXN0LWFsdCc6J2YwMjInLCdsb2NrJzonZjAyMycsJ2ZsYWcnOidmMDI0JywnaGVhZHBob25lcyc6J2YwMjUnLCd2b2x1bWUtb2ZmJzonZjAyNicsJ3ZvbHVtZS1kb3duJzonZjAyNycsJ3ZvbHVtZS11cCc6J2YwMjgnLCdxcmNvZGUnOidmMDI5JywnYmFyY29kZSc6J2YwMmEnLCd0YWcnOidmMDJiJywndGFncyc6J2YwMmMnLCdib29rJzonZjAyZCcsJ2Jvb2ttYXJrJzonZjAyZScsJ3ByaW50JzonZjAyZicsJ2NhbWVyYSc6J2YwMzAnLCdmb250JzonZjAzMScsJ2JvbGQnOidmMDMyJywnaXRhbGljJzonZjAzMycsJ3RleHQtaGVpZ2h0JzonZjAzNCcsJ3RleHQtd2lkdGgnOidmMDM1JywnYWxpZ24tbGVmdCc6J2YwMzYnLCdhbGlnbi1jZW50ZXInOidmMDM3JywnYWxpZ24tcmlnaHQnOidmMDM4JywnYWxpZ24tanVzdGlmeSc6J2YwMzknLCdsaXN0JzonZjAzYScsJ2RlZGVudCxvdXRkZW50JzonZjAzYicsJ2luZGVudCc6J2YwM2MnLCd2aWRlby1jYW1lcmEnOidmMDNkJywncGhvdG8saW1hZ2UscGljdHVyZS1vJzonZjAzZScsJ3BlbmNpbCc6J2YwNDAnLCdtYXAtbWFya2VyJzonZjA0MScsJ2FkanVzdCc6J2YwNDInLCd0aW50JzonZjA0MycsJ2VkaXQscGVuY2lsLXNxdWFyZS1vJzonZjA0NCcsJ3NoYXJlLXNxdWFyZS1vJzonZjA0NScsJ2NoZWNrLXNxdWFyZS1vJzonZjA0NicsJ2Fycm93cyc6J2YwNDcnLCdzdGVwLWJhY2t3YXJkJzonZjA0OCcsJ2Zhc3QtYmFja3dhcmQnOidmMDQ5JywnYmFja3dhcmQnOidmMDRhJywncGxheSc6J2YwNGInLCdwYXVzZSc6J2YwNGMnLCdzdG9wJzonZjA0ZCcsJ2ZvcndhcmQnOidmMDRlJywnZmFzdC1mb3J3YXJkJzonZjA1MCcsJ3N0ZXAtZm9yd2FyZCc6J2YwNTEnLCdlamVjdCc6J2YwNTInLCdjaGV2cm9uLWxlZnQnOidmMDUzJywnY2hldnJvbi1yaWdodCc6J2YwNTQnLCdwbHVzLWNpcmNsZSc6J2YwNTUnLCdtaW51cy1jaXJjbGUnOidmMDU2JywndGltZXMtY2lyY2xlJzonZjA1NycsJ2NoZWNrLWNpcmNsZSc6J2YwNTgnLCdxdWVzdGlvbi1jaXJjbGUnOidmMDU5JywnaW5mby1jaXJjbGUnOidmMDVhJywnY3Jvc3NoYWlycyc6J2YwNWInLCd0aW1lcy1jaXJjbGUtbyc6J2YwNWMnLCdjaGVjay1jaXJjbGUtbyc6J2YwNWQnLCdiYW4nOidmMDVlJywnYXJyb3ctbGVmdCc6J2YwNjAnLCdhcnJvdy1yaWdodCc6J2YwNjEnLCdhcnJvdy11cCc6J2YwNjInLCdhcnJvdy1kb3duJzonZjA2MycsJ21haWwtZm9yd2FyZCxzaGFyZSc6J2YwNjQnLCdleHBhbmQnOidmMDY1JywnY29tcHJlc3MnOidmMDY2JywncGx1cyc6J2YwNjcnLCdtaW51cyc6J2YwNjgnLCdhc3Rlcmlzayc6J2YwNjknLCdleGNsYW1hdGlvbi1jaXJjbGUnOidmMDZhJywnZ2lmdCc6J2YwNmInLCdsZWFmJzonZjA2YycsJ2ZpcmUnOidmMDZkJywnZXllJzonZjA2ZScsJ2V5ZS1zbGFzaCc6J2YwNzAnLCd3YXJuaW5nLGV4Y2xhbWF0aW9uLXRyaWFuZ2xlJzonZjA3MScsJ3BsYW5lJzonZjA3MicsJ2NhbGVuZGFyJzonZjA3MycsJ3JhbmRvbSc6J2YwNzQnLCdjb21tZW50JzonZjA3NScsJ21hZ25ldCc6J2YwNzYnLCdjaGV2cm9uLXVwJzonZjA3NycsJ2NoZXZyb24tZG93bic6J2YwNzgnLCdyZXR3ZWV0JzonZjA3OScsJ3Nob3BwaW5nLWNhcnQnOidmMDdhJywnZm9sZGVyJzonZjA3YicsJ2ZvbGRlci1vcGVuJzonZjA3YycsJ2Fycm93cy12JzonZjA3ZCcsJ2Fycm93cy1oJzonZjA3ZScsJ2Jhci1jaGFydC1vLGJhci1jaGFydCc6J2YwODAnLCd0d2l0dGVyLXNxdWFyZSc6J2YwODEnLCdmYWNlYm9vay1zcXVhcmUnOidmMDgyJywnY2FtZXJhLXJldHJvJzonZjA4MycsJ2tleSc6J2YwODQnLCdnZWFycyxjb2dzJzonZjA4NScsJ2NvbW1lbnRzJzonZjA4NicsJ3RodW1icy1vLXVwJzonZjA4NycsJ3RodW1icy1vLWRvd24nOidmMDg4Jywnc3Rhci1oYWxmJzonZjA4OScsJ2hlYXJ0LW8nOidmMDhhJywnc2lnbi1vdXQnOidmMDhiJywnbGlua2VkaW4tc3F1YXJlJzonZjA4YycsJ3RodW1iLXRhY2snOidmMDhkJywnZXh0ZXJuYWwtbGluayc6J2YwOGUnLCdzaWduLWluJzonZjA5MCcsJ3Ryb3BoeSc6J2YwOTEnLCdnaXRodWItc3F1YXJlJzonZjA5MicsJ3VwbG9hZCc6J2YwOTMnLCdsZW1vbi1vJzonZjA5NCcsJ3Bob25lJzonZjA5NScsJ3NxdWFyZS1vJzonZjA5NicsJ2Jvb2ttYXJrLW8nOidmMDk3JywncGhvbmUtc3F1YXJlJzonZjA5OCcsJ3R3aXR0ZXInOidmMDk5JywnZmFjZWJvb2stZixmYWNlYm9vayc6J2YwOWEnLCdnaXRodWInOidmMDliJywndW5sb2NrJzonZjA5YycsJ2NyZWRpdC1jYXJkJzonZjA5ZCcsJ2ZlZWQscnNzJzonZjA5ZScsJ2hkZC1vJzonZjBhMCcsJ2J1bGxob3JuJzonZjBhMScsJ2JlbGwnOidmMGYzJywnY2VydGlmaWNhdGUnOidmMGEzJywnaGFuZC1vLXJpZ2h0JzonZjBhNCcsJ2hhbmQtby1sZWZ0JzonZjBhNScsJ2hhbmQtby11cCc6J2YwYTYnLCdoYW5kLW8tZG93bic6J2YwYTcnLCdhcnJvdy1jaXJjbGUtbGVmdCc6J2YwYTgnLCdhcnJvdy1jaXJjbGUtcmlnaHQnOidmMGE5JywnYXJyb3ctY2lyY2xlLXVwJzonZjBhYScsJ2Fycm93LWNpcmNsZS1kb3duJzonZjBhYicsJ2dsb2JlJzonZjBhYycsJ3dyZW5jaCc6J2YwYWQnLCd0YXNrcyc6J2YwYWUnLCdmaWx0ZXInOidmMGIwJywnYnJpZWZjYXNlJzonZjBiMScsJ2Fycm93cy1hbHQnOidmMGIyJywnZ3JvdXAsdXNlcnMnOidmMGMwJywnY2hhaW4sbGluayc6J2YwYzEnLCdjbG91ZCc6J2YwYzInLCdmbGFzayc6J2YwYzMnLCdjdXQsc2Npc3NvcnMnOidmMGM0JywnY29weSxmaWxlcy1vJzonZjBjNScsJ3BhcGVyY2xpcCc6J2YwYzYnLCdzYXZlLGZsb3BweS1vJzonZjBjNycsJ3NxdWFyZSc6J2YwYzgnLCduYXZpY29uLHJlb3JkZXIsYmFycyc6J2YwYzknLCdsaXN0LXVsJzonZjBjYScsJ2xpc3Qtb2wnOidmMGNiJywnc3RyaWtldGhyb3VnaCc6J2YwY2MnLCd1bmRlcmxpbmUnOidmMGNkJywndGFibGUnOidmMGNlJywnbWFnaWMnOidmMGQwJywndHJ1Y2snOidmMGQxJywncGludGVyZXN0JzonZjBkMicsJ3BpbnRlcmVzdC1zcXVhcmUnOidmMGQzJywnZ29vZ2xlLXBsdXMtc3F1YXJlJzonZjBkNCcsJ2dvb2dsZS1wbHVzJzonZjBkNScsJ21vbmV5JzonZjBkNicsJ2NhcmV0LWRvd24nOidmMGQ3JywnY2FyZXQtdXAnOidmMGQ4JywnY2FyZXQtbGVmdCc6J2YwZDknLCdjYXJldC1yaWdodCc6J2YwZGEnLCdjb2x1bW5zJzonZjBkYicsJ3Vuc29ydGVkLHNvcnQnOidmMGRjJywnc29ydC1kb3duLHNvcnQtZGVzYyc6J2YwZGQnLCdzb3J0LXVwLHNvcnQtYXNjJzonZjBkZScsJ2VudmVsb3BlJzonZjBlMCcsJ2xpbmtlZGluJzonZjBlMScsJ3JvdGF0ZS1sZWZ0LHVuZG8nOidmMGUyJywnbGVnYWwsZ2F2ZWwnOidmMGUzJywnZGFzaGJvYXJkLHRhY2hvbWV0ZXInOidmMGU0JywnY29tbWVudC1vJzonZjBlNScsJ2NvbW1lbnRzLW8nOidmMGU2JywnZmxhc2gsYm9sdCc6J2YwZTcnLCdzaXRlbWFwJzonZjBlOCcsJ3VtYnJlbGxhJzonZjBlOScsJ3Bhc3RlLGNsaXBib2FyZCc6J2YwZWEnLCdsaWdodGJ1bGItbyc6J2YwZWInLCdleGNoYW5nZSc6J2YwZWMnLCdjbG91ZC1kb3dubG9hZCc6J2YwZWQnLCdjbG91ZC11cGxvYWQnOidmMGVlJywndXNlci1tZCc6J2YwZjAnLCdzdGV0aG9zY29wZSc6J2YwZjEnLCdzdWl0Y2FzZSc6J2YwZjInLCdiZWxsLW8nOidmMGEyJywnY29mZmVlJzonZjBmNCcsJ2N1dGxlcnknOidmMGY1JywnZmlsZS10ZXh0LW8nOidmMGY2JywnYnVpbGRpbmctbyc6J2YwZjcnLCdob3NwaXRhbC1vJzonZjBmOCcsJ2FtYnVsYW5jZSc6J2YwZjknLCdtZWRraXQnOidmMGZhJywnZmlnaHRlci1qZXQnOidmMGZiJywnYmVlcic6J2YwZmMnLCdoLXNxdWFyZSc6J2YwZmQnLCdwbHVzLXNxdWFyZSc6J2YwZmUnLCdhbmdsZS1kb3VibGUtbGVmdCc6J2YxMDAnLCdhbmdsZS1kb3VibGUtcmlnaHQnOidmMTAxJywnYW5nbGUtZG91YmxlLXVwJzonZjEwMicsJ2FuZ2xlLWRvdWJsZS1kb3duJzonZjEwMycsJ2FuZ2xlLWxlZnQnOidmMTA0JywnYW5nbGUtcmlnaHQnOidmMTA1JywnYW5nbGUtdXAnOidmMTA2JywnYW5nbGUtZG93bic6J2YxMDcnLCdkZXNrdG9wJzonZjEwOCcsJ2xhcHRvcCc6J2YxMDknLCd0YWJsZXQnOidmMTBhJywnbW9iaWxlLXBob25lLG1vYmlsZSc6J2YxMGInLCdjaXJjbGUtbyc6J2YxMGMnLCdxdW90ZS1sZWZ0JzonZjEwZCcsJ3F1b3RlLXJpZ2h0JzonZjEwZScsJ3NwaW5uZXInOidmMTEwJywnY2lyY2xlJzonZjExMScsJ21haWwtcmVwbHkscmVwbHknOidmMTEyJywnZ2l0aHViLWFsdCc6J2YxMTMnLCdmb2xkZXItbyc6J2YxMTQnLCdmb2xkZXItb3Blbi1vJzonZjExNScsJ3NtaWxlLW8nOidmMTE4JywnZnJvd24tbyc6J2YxMTknLCdtZWgtbyc6J2YxMWEnLCdnYW1lcGFkJzonZjExYicsJ2tleWJvYXJkLW8nOidmMTFjJywnZmxhZy1vJzonZjExZCcsJ2ZsYWctY2hlY2tlcmVkJzonZjExZScsJ3Rlcm1pbmFsJzonZjEyMCcsJ2NvZGUnOidmMTIxJywnbWFpbC1yZXBseS1hbGwscmVwbHktYWxsJzonZjEyMicsJ3N0YXItaGFsZi1lbXB0eSxzdGFyLWhhbGYtZnVsbCxzdGFyLWhhbGYtbyc6J2YxMjMnLCdsb2NhdGlvbi1hcnJvdyc6J2YxMjQnLCdjcm9wJzonZjEyNScsJ2NvZGUtZm9yayc6J2YxMjYnLCd1bmxpbmssY2hhaW4tYnJva2VuJzonZjEyNycsJ3F1ZXN0aW9uJzonZjEyOCcsJ2luZm8nOidmMTI5JywnZXhjbGFtYXRpb24nOidmMTJhJywnc3VwZXJzY3JpcHQnOidmMTJiJywnc3Vic2NyaXB0JzonZjEyYycsJ2VyYXNlcic6J2YxMmQnLCdwdXp6bGUtcGllY2UnOidmMTJlJywnbWljcm9waG9uZSc6J2YxMzAnLCdtaWNyb3Bob25lLXNsYXNoJzonZjEzMScsJ3NoaWVsZCc6J2YxMzInLCdjYWxlbmRhci1vJzonZjEzMycsJ2ZpcmUtZXh0aW5ndWlzaGVyJzonZjEzNCcsJ3JvY2tldCc6J2YxMzUnLCdtYXhjZG4nOidmMTM2JywnY2hldnJvbi1jaXJjbGUtbGVmdCc6J2YxMzcnLCdjaGV2cm9uLWNpcmNsZS1yaWdodCc6J2YxMzgnLCdjaGV2cm9uLWNpcmNsZS11cCc6J2YxMzknLCdjaGV2cm9uLWNpcmNsZS1kb3duJzonZjEzYScsJ2h0bWw1JzonZjEzYicsJ2NzczMnOidmMTNjJywnYW5jaG9yJzonZjEzZCcsJ3VubG9jay1hbHQnOidmMTNlJywnYnVsbHNleWUnOidmMTQwJywnZWxsaXBzaXMtaCc6J2YxNDEnLCdlbGxpcHNpcy12JzonZjE0MicsJ3Jzcy1zcXVhcmUnOidmMTQzJywncGxheS1jaXJjbGUnOidmMTQ0JywndGlja2V0JzonZjE0NScsJ21pbnVzLXNxdWFyZSc6J2YxNDYnLCdtaW51cy1zcXVhcmUtbyc6J2YxNDcnLCdsZXZlbC11cCc6J2YxNDgnLCdsZXZlbC1kb3duJzonZjE0OScsJ2NoZWNrLXNxdWFyZSc6J2YxNGEnLCdwZW5jaWwtc3F1YXJlJzonZjE0YicsJ2V4dGVybmFsLWxpbmstc3F1YXJlJzonZjE0YycsJ3NoYXJlLXNxdWFyZSc6J2YxNGQnLCdjb21wYXNzJzonZjE0ZScsJ3RvZ2dsZS1kb3duLGNhcmV0LXNxdWFyZS1vLWRvd24nOidmMTUwJywndG9nZ2xlLXVwLGNhcmV0LXNxdWFyZS1vLXVwJzonZjE1MScsJ3RvZ2dsZS1yaWdodCxjYXJldC1zcXVhcmUtby1yaWdodCc6J2YxNTInLCdldXJvLGV1cic6J2YxNTMnLCdnYnAnOidmMTU0JywnZG9sbGFyLHVzZCc6J2YxNTUnLCdydXBlZSxpbnInOidmMTU2JywnY255LHJtYix5ZW4sanB5JzonZjE1NycsJ3J1YmxlLHJvdWJsZSxydWInOidmMTU4Jywnd29uLGtydyc6J2YxNTknLCdiaXRjb2luLGJ0Yyc6J2YxNWEnLCdmaWxlJzonZjE1YicsJ2ZpbGUtdGV4dCc6J2YxNWMnLCdzb3J0LWFscGhhLWFzYyc6J2YxNWQnLCdzb3J0LWFscGhhLWRlc2MnOidmMTVlJywnc29ydC1hbW91bnQtYXNjJzonZjE2MCcsJ3NvcnQtYW1vdW50LWRlc2MnOidmMTYxJywnc29ydC1udW1lcmljLWFzYyc6J2YxNjInLCdzb3J0LW51bWVyaWMtZGVzYyc6J2YxNjMnLCd0aHVtYnMtdXAnOidmMTY0JywndGh1bWJzLWRvd24nOidmMTY1JywneW91dHViZS1zcXVhcmUnOidmMTY2JywneW91dHViZSc6J2YxNjcnLCd4aW5nJzonZjE2OCcsJ3hpbmctc3F1YXJlJzonZjE2OScsJ3lvdXR1YmUtcGxheSc6J2YxNmEnLCdkcm9wYm94JzonZjE2YicsJ3N0YWNrLW92ZXJmbG93JzonZjE2YycsJ2luc3RhZ3JhbSc6J2YxNmQnLCdmbGlja3InOidmMTZlJywnYWRuJzonZjE3MCcsJ2JpdGJ1Y2tldCc6J2YxNzEnLCdiaXRidWNrZXQtc3F1YXJlJzonZjE3MicsJ3R1bWJscic6J2YxNzMnLCd0dW1ibHItc3F1YXJlJzonZjE3NCcsJ2xvbmctYXJyb3ctZG93bic6J2YxNzUnLCdsb25nLWFycm93LXVwJzonZjE3NicsJ2xvbmctYXJyb3ctbGVmdCc6J2YxNzcnLCdsb25nLWFycm93LXJpZ2h0JzonZjE3OCcsJ2FwcGxlJzonZjE3OScsJ3dpbmRvd3MnOidmMTdhJywnYW5kcm9pZCc6J2YxN2InLCdsaW51eCc6J2YxN2MnLCdkcmliYmJsZSc6J2YxN2QnLCdza3lwZSc6J2YxN2UnLCdmb3Vyc3F1YXJlJzonZjE4MCcsJ3RyZWxsbyc6J2YxODEnLCdmZW1hbGUnOidmMTgyJywnbWFsZSc6J2YxODMnLCdnaXR0aXAsZ3JhdGlwYXknOidmMTg0Jywnc3VuLW8nOidmMTg1JywnbW9vbi1vJzonZjE4NicsJ2FyY2hpdmUnOidmMTg3JywnYnVnJzonZjE4OCcsJ3ZrJzonZjE4OScsJ3dlaWJvJzonZjE4YScsJ3JlbnJlbic6J2YxOGInLCdwYWdlbGluZXMnOidmMThjJywnc3RhY2stZXhjaGFuZ2UnOidmMThkJywnYXJyb3ctY2lyY2xlLW8tcmlnaHQnOidmMThlJywnYXJyb3ctY2lyY2xlLW8tbGVmdCc6J2YxOTAnLCd0b2dnbGUtbGVmdCxjYXJldC1zcXVhcmUtby1sZWZ0JzonZjE5MScsJ2RvdC1jaXJjbGUtbyc6J2YxOTInLCd3aGVlbGNoYWlyJzonZjE5MycsJ3ZpbWVvLXNxdWFyZSc6J2YxOTQnLCd0dXJraXNoLWxpcmEsdHJ5JzonZjE5NScsJ3BsdXMtc3F1YXJlLW8nOidmMTk2Jywnc3BhY2Utc2h1dHRsZSc6J2YxOTcnLCdzbGFjayc6J2YxOTgnLCdlbnZlbG9wZS1zcXVhcmUnOidmMTk5Jywnd29yZHByZXNzJzonZjE5YScsJ29wZW5pZCc6J2YxOWInLCdpbnN0aXR1dGlvbixiYW5rLHVuaXZlcnNpdHknOidmMTljJywnbW9ydGFyLWJvYXJkLGdyYWR1YXRpb24tY2FwJzonZjE5ZCcsJ3lhaG9vJzonZjE5ZScsJ2dvb2dsZSc6J2YxYTAnLCdyZWRkaXQnOidmMWExJywncmVkZGl0LXNxdWFyZSc6J2YxYTInLCdzdHVtYmxldXBvbi1jaXJjbGUnOidmMWEzJywnc3R1bWJsZXVwb24nOidmMWE0JywnZGVsaWNpb3VzJzonZjFhNScsJ2RpZ2cnOidmMWE2JywncGllZC1waXBlci1wcCc6J2YxYTcnLCdwaWVkLXBpcGVyLWFsdCc6J2YxYTgnLCdkcnVwYWwnOidmMWE5Jywnam9vbWxhJzonZjFhYScsJ2xhbmd1YWdlJzonZjFhYicsJ2ZheCc6J2YxYWMnLCdidWlsZGluZyc6J2YxYWQnLCdjaGlsZCc6J2YxYWUnLCdwYXcnOidmMWIwJywnc3Bvb24nOidmMWIxJywnY3ViZSc6J2YxYjInLCdjdWJlcyc6J2YxYjMnLCdiZWhhbmNlJzonZjFiNCcsJ2JlaGFuY2Utc3F1YXJlJzonZjFiNScsJ3N0ZWFtJzonZjFiNicsJ3N0ZWFtLXNxdWFyZSc6J2YxYjcnLCdyZWN5Y2xlJzonZjFiOCcsJ2F1dG9tb2JpbGUsY2FyJzonZjFiOScsJ2NhYix0YXhpJzonZjFiYScsJ3RyZWUnOidmMWJiJywnc3BvdGlmeSc6J2YxYmMnLCdkZXZpYW50YXJ0JzonZjFiZCcsJ3NvdW5kY2xvdWQnOidmMWJlJywnZGF0YWJhc2UnOidmMWMwJywnZmlsZS1wZGYtbyc6J2YxYzEnLCdmaWxlLXdvcmQtbyc6J2YxYzInLCdmaWxlLWV4Y2VsLW8nOidmMWMzJywnZmlsZS1wb3dlcnBvaW50LW8nOidmMWM0JywnZmlsZS1waG90by1vLGZpbGUtcGljdHVyZS1vLGZpbGUtaW1hZ2Utbyc6J2YxYzUnLCdmaWxlLXppcC1vLGZpbGUtYXJjaGl2ZS1vJzonZjFjNicsJ2ZpbGUtc291bmQtbyxmaWxlLWF1ZGlvLW8nOidmMWM3JywnZmlsZS1tb3ZpZS1vLGZpbGUtdmlkZW8tbyc6J2YxYzgnLCdmaWxlLWNvZGUtbyc6J2YxYzknLCd2aW5lJzonZjFjYScsJ2NvZGVwZW4nOidmMWNiJywnanNmaWRkbGUnOidmMWNjJywnbGlmZS1ib3V5LGxpZmUtYnVveSxsaWZlLXNhdmVyLHN1cHBvcnQsbGlmZS1yaW5nJzonZjFjZCcsJ2NpcmNsZS1vLW5vdGNoJzonZjFjZScsJ3JhLHJlc2lzdGFuY2UscmViZWwnOidmMWQwJywnZ2UsZW1waXJlJzonZjFkMScsJ2dpdC1zcXVhcmUnOidmMWQyJywnZ2l0JzonZjFkMycsJ3ktY29tYmluYXRvci1zcXVhcmUseWMtc3F1YXJlLGhhY2tlci1uZXdzJzonZjFkNCcsJ3RlbmNlbnQtd2VpYm8nOidmMWQ1JywncXEnOidmMWQ2Jywnd2VjaGF0LHdlaXhpbic6J2YxZDcnLCdzZW5kLHBhcGVyLXBsYW5lJzonZjFkOCcsJ3NlbmQtbyxwYXBlci1wbGFuZS1vJzonZjFkOScsJ2hpc3RvcnknOidmMWRhJywnY2lyY2xlLXRoaW4nOidmMWRiJywnaGVhZGVyJzonZjFkYycsJ3BhcmFncmFwaCc6J2YxZGQnLCdzbGlkZXJzJzonZjFkZScsJ3NoYXJlLWFsdCc6J2YxZTAnLCdzaGFyZS1hbHQtc3F1YXJlJzonZjFlMScsJ2JvbWInOidmMWUyJywnc29jY2VyLWJhbGwtbyxmdXRib2wtbyc6J2YxZTMnLCd0dHknOidmMWU0JywnYmlub2N1bGFycyc6J2YxZTUnLCdwbHVnJzonZjFlNicsJ3NsaWRlc2hhcmUnOidmMWU3JywndHdpdGNoJzonZjFlOCcsJ3llbHAnOidmMWU5JywnbmV3c3BhcGVyLW8nOidmMWVhJywnd2lmaSc6J2YxZWInLCdjYWxjdWxhdG9yJzonZjFlYycsJ3BheXBhbCc6J2YxZWQnLCdnb29nbGUtd2FsbGV0JzonZjFlZScsJ2NjLXZpc2EnOidmMWYwJywnY2MtbWFzdGVyY2FyZCc6J2YxZjEnLCdjYy1kaXNjb3Zlcic6J2YxZjInLCdjYy1hbWV4JzonZjFmMycsJ2NjLXBheXBhbCc6J2YxZjQnLCdjYy1zdHJpcGUnOidmMWY1JywnYmVsbC1zbGFzaCc6J2YxZjYnLCdiZWxsLXNsYXNoLW8nOidmMWY3JywndHJhc2gnOidmMWY4JywnY29weXJpZ2h0JzonZjFmOScsJ2F0JzonZjFmYScsJ2V5ZWRyb3BwZXInOidmMWZiJywncGFpbnQtYnJ1c2gnOidmMWZjJywnYmlydGhkYXktY2FrZSc6J2YxZmQnLCdhcmVhLWNoYXJ0JzonZjFmZScsJ3BpZS1jaGFydCc6J2YyMDAnLCdsaW5lLWNoYXJ0JzonZjIwMScsJ2xhc3RmbSc6J2YyMDInLCdsYXN0Zm0tc3F1YXJlJzonZjIwMycsJ3RvZ2dsZS1vZmYnOidmMjA0JywndG9nZ2xlLW9uJzonZjIwNScsJ2JpY3ljbGUnOidmMjA2JywnYnVzJzonZjIwNycsJ2lveGhvc3QnOidmMjA4JywnYW5nZWxsaXN0JzonZjIwOScsJ2NjJzonZjIwYScsJ3NoZWtlbCxzaGVxZWwsaWxzJzonZjIwYicsJ21lYW5wYXRoJzonZjIwYycsJ2J1eXNlbGxhZHMnOidmMjBkJywnY29ubmVjdGRldmVsb3AnOidmMjBlJywnZGFzaGN1YmUnOidmMjEwJywnZm9ydW1iZWUnOidmMjExJywnbGVhbnB1Yic6J2YyMTInLCdzZWxsc3knOidmMjEzJywnc2hpcnRzaW5idWxrJzonZjIxNCcsJ3NpbXBseWJ1aWx0JzonZjIxNScsJ3NreWF0bGFzJzonZjIxNicsJ2NhcnQtcGx1cyc6J2YyMTcnLCdjYXJ0LWFycm93LWRvd24nOidmMjE4JywnZGlhbW9uZCc6J2YyMTknLCdzaGlwJzonZjIxYScsJ3VzZXItc2VjcmV0JzonZjIxYicsJ21vdG9yY3ljbGUnOidmMjFjJywnc3RyZWV0LXZpZXcnOidmMjFkJywnaGVhcnRiZWF0JzonZjIxZScsJ3ZlbnVzJzonZjIyMScsJ21hcnMnOidmMjIyJywnbWVyY3VyeSc6J2YyMjMnLCdpbnRlcnNleCx0cmFuc2dlbmRlcic6J2YyMjQnLCd0cmFuc2dlbmRlci1hbHQnOidmMjI1JywndmVudXMtZG91YmxlJzonZjIyNicsJ21hcnMtZG91YmxlJzonZjIyNycsJ3ZlbnVzLW1hcnMnOidmMjI4JywnbWFycy1zdHJva2UnOidmMjI5JywnbWFycy1zdHJva2Utdic6J2YyMmEnLCdtYXJzLXN0cm9rZS1oJzonZjIyYicsJ25ldXRlcic6J2YyMmMnLCdnZW5kZXJsZXNzJzonZjIyZCcsJ2ZhY2Vib29rLW9mZmljaWFsJzonZjIzMCcsJ3BpbnRlcmVzdC1wJzonZjIzMScsJ3doYXRzYXBwJzonZjIzMicsJ3NlcnZlcic6J2YyMzMnLCd1c2VyLXBsdXMnOidmMjM0JywndXNlci10aW1lcyc6J2YyMzUnLCdob3RlbCxiZWQnOidmMjM2JywndmlhY29pbic6J2YyMzcnLCd0cmFpbic6J2YyMzgnLCdzdWJ3YXknOidmMjM5JywnbWVkaXVtJzonZjIzYScsJ3ljLHktY29tYmluYXRvcic6J2YyM2InLCdvcHRpbi1tb25zdGVyJzonZjIzYycsJ29wZW5jYXJ0JzonZjIzZCcsJ2V4cGVkaXRlZHNzbCc6J2YyM2UnLCdiYXR0ZXJ5LTQsYmF0dGVyeS1mdWxsJzonZjI0MCcsJ2JhdHRlcnktMyxiYXR0ZXJ5LXRocmVlLXF1YXJ0ZXJzJzonZjI0MScsJ2JhdHRlcnktMixiYXR0ZXJ5LWhhbGYnOidmMjQyJywnYmF0dGVyeS0xLGJhdHRlcnktcXVhcnRlcic6J2YyNDMnLCdiYXR0ZXJ5LTAsYmF0dGVyeS1lbXB0eSc6J2YyNDQnLCdtb3VzZS1wb2ludGVyJzonZjI0NScsJ2ktY3Vyc29yJzonZjI0NicsJ29iamVjdC1ncm91cCc6J2YyNDcnLCdvYmplY3QtdW5ncm91cCc6J2YyNDgnLCdzdGlja3ktbm90ZSc6J2YyNDknLCdzdGlja3ktbm90ZS1vJzonZjI0YScsJ2NjLWpjYic6J2YyNGInLCdjYy1kaW5lcnMtY2x1Yic6J2YyNGMnLCdjbG9uZSc6J2YyNGQnLCdiYWxhbmNlLXNjYWxlJzonZjI0ZScsJ2hvdXJnbGFzcy1vJzonZjI1MCcsJ2hvdXJnbGFzcy0xLGhvdXJnbGFzcy1zdGFydCc6J2YyNTEnLCdob3VyZ2xhc3MtMixob3VyZ2xhc3MtaGFsZic6J2YyNTInLCdob3VyZ2xhc3MtMyxob3VyZ2xhc3MtZW5kJzonZjI1MycsJ2hvdXJnbGFzcyc6J2YyNTQnLCdoYW5kLWdyYWItbyxoYW5kLXJvY2stbyc6J2YyNTUnLCdoYW5kLXN0b3AtbyxoYW5kLXBhcGVyLW8nOidmMjU2JywnaGFuZC1zY2lzc29ycy1vJzonZjI1NycsJ2hhbmQtbGl6YXJkLW8nOidmMjU4JywnaGFuZC1zcG9jay1vJzonZjI1OScsJ2hhbmQtcG9pbnRlci1vJzonZjI1YScsJ2hhbmQtcGVhY2Utbyc6J2YyNWInLCd0cmFkZW1hcmsnOidmMjVjJywncmVnaXN0ZXJlZCc6J2YyNWQnLCdjcmVhdGl2ZS1jb21tb25zJzonZjI1ZScsJ2dnJzonZjI2MCcsJ2dnLWNpcmNsZSc6J2YyNjEnLCd0cmlwYWR2aXNvcic6J2YyNjInLCdvZG5va2xhc3NuaWtpJzonZjI2MycsJ29kbm9rbGFzc25pa2ktc3F1YXJlJzonZjI2NCcsJ2dldC1wb2NrZXQnOidmMjY1Jywnd2lraXBlZGlhLXcnOidmMjY2Jywnc2FmYXJpJzonZjI2NycsJ2Nocm9tZSc6J2YyNjgnLCdmaXJlZm94JzonZjI2OScsJ29wZXJhJzonZjI2YScsJ2ludGVybmV0LWV4cGxvcmVyJzonZjI2YicsJ3R2LHRlbGV2aXNpb24nOidmMjZjJywnY29udGFvJzonZjI2ZCcsJzUwMHB4JzonZjI2ZScsJ2FtYXpvbic6J2YyNzAnLCdjYWxlbmRhci1wbHVzLW8nOidmMjcxJywnY2FsZW5kYXItbWludXMtbyc6J2YyNzInLCdjYWxlbmRhci10aW1lcy1vJzonZjI3MycsJ2NhbGVuZGFyLWNoZWNrLW8nOidmMjc0JywnaW5kdXN0cnknOidmMjc1JywnbWFwLXBpbic6J2YyNzYnLCdtYXAtc2lnbnMnOidmMjc3JywnbWFwLW8nOidmMjc4JywnbWFwJzonZjI3OScsJ2NvbW1lbnRpbmcnOidmMjdhJywnY29tbWVudGluZy1vJzonZjI3YicsJ2hvdXp6JzonZjI3YycsJ3ZpbWVvJzonZjI3ZCcsJ2JsYWNrLXRpZSc6J2YyN2UnLCdmb250aWNvbnMnOidmMjgwJywncmVkZGl0LWFsaWVuJzonZjI4MScsJ2VkZ2UnOidmMjgyJywnY3JlZGl0LWNhcmQtYWx0JzonZjI4MycsJ2NvZGllcGllJzonZjI4NCcsJ21vZHgnOidmMjg1JywnZm9ydC1hd2Vzb21lJzonZjI4NicsJ3VzYic6J2YyODcnLCdwcm9kdWN0LWh1bnQnOidmMjg4JywnbWl4Y2xvdWQnOidmMjg5Jywnc2NyaWJkJzonZjI4YScsJ3BhdXNlLWNpcmNsZSc6J2YyOGInLCdwYXVzZS1jaXJjbGUtbyc6J2YyOGMnLCdzdG9wLWNpcmNsZSc6J2YyOGQnLCdzdG9wLWNpcmNsZS1vJzonZjI4ZScsJ3Nob3BwaW5nLWJhZyc6J2YyOTAnLCdzaG9wcGluZy1iYXNrZXQnOidmMjkxJywnaGFzaHRhZyc6J2YyOTInLCdibHVldG9vdGgnOidmMjkzJywnYmx1ZXRvb3RoLWInOidmMjk0JywncGVyY2VudCc6J2YyOTUnLCdnaXRsYWInOidmMjk2Jywnd3BiZWdpbm5lcic6J2YyOTcnLCd3cGZvcm1zJzonZjI5OCcsJ2VudmlyYSc6J2YyOTknLCd1bml2ZXJzYWwtYWNjZXNzJzonZjI5YScsJ3doZWVsY2hhaXItYWx0JzonZjI5YicsJ3F1ZXN0aW9uLWNpcmNsZS1vJzonZjI5YycsJ2JsaW5kJzonZjI5ZCcsJ2F1ZGlvLWRlc2NyaXB0aW9uJzonZjI5ZScsJ3ZvbHVtZS1jb250cm9sLXBob25lJzonZjJhMCcsJ2JyYWlsbGUnOidmMmExJywnYXNzaXN0aXZlLWxpc3RlbmluZy1zeXN0ZW1zJzonZjJhMicsJ2FzbC1pbnRlcnByZXRpbmcsYW1lcmljYW4tc2lnbi1sYW5ndWFnZS1pbnRlcnByZXRpbmcnOidmMmEzJywnZGVhZm5lc3MsaGFyZC1vZi1oZWFyaW5nLGRlYWYnOidmMmE0JywnZ2xpZGUnOidmMmE1JywnZ2xpZGUtZyc6J2YyYTYnLCdzaWduaW5nLHNpZ24tbGFuZ3VhZ2UnOidmMmE3JywnbG93LXZpc2lvbic6J2YyYTgnLCd2aWFkZW8nOidmMmE5JywndmlhZGVvLXNxdWFyZSc6J2YyYWEnLCdzbmFwY2hhdCc6J2YyYWInLCdzbmFwY2hhdC1naG9zdCc6J2YyYWMnLCdzbmFwY2hhdC1zcXVhcmUnOidmMmFkJywncGllZC1waXBlcic6J2YyYWUnLCdmaXJzdC1vcmRlcic6J2YyYjAnLCd5b2FzdCc6J2YyYjEnLCd0aGVtZWlzbGUnOidmMmIyJywnZ29vZ2xlLXBsdXMtY2lyY2xlLGdvb2dsZS1wbHVzLW9mZmljaWFsJzonZjJiMycsJ2ZhLGZvbnQtYXdlc29tZSc6J2YyYjQnfTtcbiAgICB9XG4gICAgXG4gICAgZnVuY3Rpb24gaWNvbihkKSB7XG4gICAgICB2YXIgY29kZTtcbiAgICAgIFxuICAgICAgaWYgKG9wdGlvbnMuaWNvbk1hcCAmJiBvcHRpb25zLnNob3dJY29ucyAmJiBvcHRpb25zLmljb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXSAmJiBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dKSB7XG4gICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV07XG4gICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5pY29uTWFwW2QubGFiZWxzWzBdXSkge1xuICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dO1xuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dKSB7XG4gICAgICAgICAgY29kZSA9IG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cblxuZnVuY3Rpb24gaW1hZ2UoZCkge1xuICB2YXIgaSwgaW1hZ2VzRm9yTGFiZWwsIGltZywgaW1nTGV2ZWwsIGxhYmVsLCBsYWJlbFByb3BlcnR5VmFsdWUsIHByb3BlcnR5LCB2YWx1ZTtcbiAgXG4gIGlmIChvcHRpb25zLmltYWdlcykge1xuICAgIGltYWdlc0ZvckxhYmVsID0gb3B0aW9ucy5pbWFnZU1hcFtkLmxhYmVsc1swXV07XG4gICAgXG4gICAgaWYgKGltYWdlc0ZvckxhYmVsKSB7XG4gICAgICBpbWdMZXZlbCA9IDA7XG4gICAgICBcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBpbWFnZXNGb3JMYWJlbC5sZW5ndGg7IGkrKykge1xuICAgICAgICBsYWJlbFByb3BlcnR5VmFsdWUgPSBpbWFnZXNGb3JMYWJlbFtpXS5zcGxpdCgnfCcpO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgdmFsdWUgPSBsYWJlbFByb3BlcnR5VmFsdWVbMl07XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgcHJvcGVydHkgPSBsYWJlbFByb3BlcnR5VmFsdWVbMV07XG4gICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgbGFiZWwgPSBsYWJlbFByb3BlcnR5VmFsdWVbMF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChkLmxhYmVsc1swXSA9PT0gbGFiZWwgJiZcbiAgICAgICAgICAoIXByb3BlcnR5IHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCkgJiZcbiAgICAgICAgICAoIXZhbHVlIHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gPT09IHZhbHVlKSkge1xuICAgICAgICAgIGlmIChsYWJlbFByb3BlcnR5VmFsdWUubGVuZ3RoID4gaW1nTGV2ZWwpIHtcbiAgICAgICAgICAgIGltZyA9IG9wdGlvbnMuaW1hZ2VzW2ltYWdlc0ZvckxhYmVsW2ldXTtcbiAgICAgICAgICAgIGltZ0xldmVsID0gbGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBpbWc7XG59XG5cbmZ1bmN0aW9uIGluaXQoX3NlbGVjdG9yLCBfb3B0aW9ucykge1xuICBpbml0SWNvbk1hcCgpO1xuICBcbiAgbWVyZ2Uob3B0aW9ucywgX29wdGlvbnMpO1xuICBcbiAgaWYgKG9wdGlvbnMuaWNvbnMpIHtcbiAgICBvcHRpb25zLnNob3dJY29ucyA9IHRydWU7XG4gIH1cbiAgXG4gIGlmICghb3B0aW9ucy5taW5Db2xsaXNpb24pIHtcbiAgICBvcHRpb25zLm1pbkNvbGxpc2lvbiA9IG9wdGlvbnMubm9kZVJhZGl1cyAqIDI7XG4gIH1cbiAgXG4gIGluaXRJbWFnZU1hcCgpO1xuICBcbiAgc2VsZWN0b3IgPSBfc2VsZWN0b3I7XG4gIFxuICBjb250YWluZXIgPSBkMy5zZWxlY3Qoc2VsZWN0b3IpO1xuICBcbiAgY29udGFpbmVyLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMnKVxuICAgIC5odG1sKCcnKTtcbiAgXG4gIGlmIChvcHRpb25zLmluZm9QYW5lbCkge1xuICAgIGluZm8gPSBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKTtcbiAgfVxuICBcbiAgYXBwZW5kR3JhcGgoY29udGFpbmVyKTtcbiAgXG4gIHNpbXVsYXRpb24gPSBpbml0U2ltdWxhdGlvbigpO1xuICBcbiAgaWYgKG9wdGlvbnMubmVvNGpEYXRhKSB7XG4gICAgbG9hZE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XG4gIH0gZWxzZSBpZiAob3B0aW9ucy5uZW80akRhdGFVcmwpIHtcbiAgICBsb2FkTmVvNGpEYXRhRnJvbVVybChvcHRpb25zLm5lbzRqRGF0YVVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6IGJvdGggbmVvNGpEYXRhIGFuZCBuZW80akRhdGFVcmwgYXJlIGVtcHR5IScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluaXRJY29uTWFwKCkge1xuICBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpbmRleCkge1xuICAgIHZhciBrZXlzID0ga2V5LnNwbGl0KCcsJyksXG4gICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcbiAgICBcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBvcHRpb25zLmljb25NYXBba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaW5pdEltYWdlTWFwKCkge1xuICB2YXIga2V5LCBrZXlzLCBzZWxlY3RvcjtcbiAgXG4gIGZvciAoa2V5IGluIG9wdGlvbnMuaW1hZ2VzKSB7XG4gICAgaWYgKG9wdGlvbnMuaW1hZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGtleXMgPSBrZXkuc3BsaXQoJ3wnKTtcblxuICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XG4gICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0gPSBba2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0ucHVzaChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpbml0U2ltdWxhdGlvbigpIHtcbiAgdmFyIHNpbXVsYXRpb24gPSBkMy5mb3JjZVNpbXVsYXRpb24oKVxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgIC52ZWxvY2l0eURlY2F5KDAuOClcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yY2UoJ3gnLCBkMy5mb3JjZSgpLnN0cmVuZ3RoKDAuMDAyKSlcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yY2UoJ3knLCBkMy5mb3JjZSgpLnN0cmVuZ3RoKDAuMDAyKSlcbiAgICAuZm9yY2UoJ2NvbGxpZGUnLCBkMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMubWluQ29sbGlzaW9uO1xuICAgIH0pLml0ZXJhdGlvbnMoMikpXG4gICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXG4gICAgLmZvcmNlKCdsaW5rJywgZDMuZm9yY2VMaW5rKCkuaWQoZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuIGQuaWQ7XG4gICAgfSkpXG4gICAgLmZvcmNlKCdjZW50ZXInLCBkMy5mb3JjZUNlbnRlcihzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRXaWR0aCAvIDIsIHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LmNsaWVudEhlaWdodCAvIDIpKVxuICAgIC5vbigndGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgdGljaygpO1xuICAgIH0pXG4gICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcbiAgICAgICAganVzdExvYWRlZCA9IHRydWU7XG4gICAgICAgIHpvb21GaXQoMik7XG4gICAgICB9XG4gICAgfSk7XG4gIFxuICByZXR1cm4gc2ltdWxhdGlvbjtcbn1cblxuZnVuY3Rpb24gbG9hZE5lbzRqRGF0YSgpIHtcbiAgbm9kZXMgPSBbXTtcbiAgcmVsYXRpb25zaGlwcyA9IFtdO1xuICBcbiAgdXBkYXRlV2l0aE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XG59XG5cbmZ1bmN0aW9uIGxvYWROZW80akRhdGFGcm9tVXJsKG5lbzRqRGF0YVVybCkge1xuICBub2RlcyA9IFtdO1xuICByZWxhdGlvbnNoaXBzID0gW107XG4gIFxuICBkMy5qc29uKG5lbzRqRGF0YVVybCwgZnVuY3Rpb24oZXJyb3IsIGRhdGEpIHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgICBcbiAgICB1cGRhdGVXaXRoTmVvNGpEYXRhKGRhdGEpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3BlcnR5KSB7XG4gICAgdGFyZ2V0W3Byb3BlcnR5XSA9IHNvdXJjZVtwcm9wZXJ0eV07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBuZW80akRhdGFUb0QzRGF0YShkYXRhKSB7XG4gIHZhciBncmFwaCA9IHtcbiAgICBub2RlczogW10sXG4gICAgcmVsYXRpb25zaGlwczogW11cbiAgfTtcbiAgXG4gIGRhdGEucmVzdWx0cy5mb3JFYWNoKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgIHJlc3VsdC5kYXRhLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YS5ncmFwaC5ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgaWYgKCFjb250YWlucyhncmFwaC5ub2Rlcywgbm9kZS5pZCkpIHtcbiAgICAgICAgICBncmFwaC5ub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmZvckVhY2goZnVuY3Rpb24ocmVsYXRpb25zaGlwKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5zb3VyY2UgPSByZWxhdGlvbnNoaXAuc3RhcnROb2RlO1xuICAgICAgICByZWxhdGlvbnNoaXAudGFyZ2V0ID0gcmVsYXRpb25zaGlwLmVuZE5vZGU7XG4gICAgICAgIGdyYXBoLnJlbGF0aW9uc2hpcHMucHVzaChyZWxhdGlvbnNoaXApO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgaWYgKGEuc291cmNlID4gYi5zb3VyY2UpIHtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIGlmIChhLnNvdXJjZSA8IGIuc291cmNlKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChhLnRhcmdldCA+IGIudGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGEudGFyZ2V0IDwgYi50YXJnZXQpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGkgIT09IDAgJiYgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLnNvdXJjZSA9PT0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ktMV0uc291cmNlICYmIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS50YXJnZXQgPT09IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpLTFdLnRhcmdldCkge1xuICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2kgLSAxXS5saW5rbnVtICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0ubGlua251bSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIFxuICByZXR1cm4gZ3JhcGg7XG59XG5cbmZ1bmN0aW9uIHJhbmRvbUQzRGF0YShkLCBtYXhOb2Rlc1RvR2VuZXJhdGUpIHtcbiAgdmFyIGRhdGEgPSB7XG4gICAgbm9kZXM6IFtdLFxuICAgIHJlbGF0aW9uc2hpcHM6IFtdXG4gIH0sXG4gIGksXG4gIGxhYmVsLFxuICBub2RlLFxuICBudW1Ob2RlcyA9IChtYXhOb2Rlc1RvR2VuZXJhdGUgKiBNYXRoLnJhbmRvbSgpIDw8IDApICsgMSxcbiAgcmVsYXRpb25zaGlwLFxuICBzID0gc2l6ZSgpO1xuICBcbiAgZm9yIChpID0gMDsgaSA8IG51bU5vZGVzOyBpKyspIHtcbiAgICBsYWJlbCA9IHJhbmRvbUxhYmVsKCk7XG4gICAgXG4gICAgbm9kZSA9IHtcbiAgICAgIGlkOiBzLm5vZGVzICsgMSArIGksXG4gICAgICBsYWJlbHM6IFtsYWJlbF0sXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHJhbmRvbTogbGFiZWxcbiAgICAgIH0sXG4gICAgICB4OiBkLngsXG4gICAgICB5OiBkLnlcbiAgICB9O1xuICAgIFxuICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcbiAgICBcbiAgICByZWxhdGlvbnNoaXAgPSB7XG4gICAgICBpZDogcy5yZWxhdGlvbnNoaXBzICsgMSArIGksXG4gICAgICB0eXBlOiBsYWJlbC50b1VwcGVyQ2FzZSgpLFxuICAgICAgc3RhcnROb2RlOiBkLmlkLFxuICAgICAgZW5kTm9kZTogcy5ub2RlcyArIDEgKyBpLFxuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBmcm9tOiBEYXRlLm5vdygpXG4gICAgICB9LFxuICAgICAgc291cmNlOiBkLmlkLFxuICAgICAgdGFyZ2V0OiBzLm5vZGVzICsgMSArIGksXG4gICAgICBsaW5rbnVtOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaVxuICAgIH07XG4gICAgXG4gICAgZGF0YS5yZWxhdGlvbnNoaXBzW2RhdGEucmVsYXRpb25zaGlwcy5sZW5ndGhdID0gcmVsYXRpb25zaGlwO1xuICB9XG4gIFxuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gcmFuZG9tTGFiZWwoKSB7XG4gIHZhciBpY29ucyA9IE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCk7XG4gIHJldHVybiBpY29uc1tpY29ucy5sZW5ndGggKiBNYXRoLnJhbmRvbSgpIDw8IDBdO1xufVxuXG5mdW5jdGlvbiByb3RhdGUoY3gsIGN5LCB4LCB5LCBhbmdsZSkge1xuICB2YXIgcmFkaWFucyA9IChNYXRoLlBJIC8gMTgwKSAqIGFuZ2xlLFxuICBjb3MgPSBNYXRoLmNvcyhyYWRpYW5zKSxcbiAgc2luID0gTWF0aC5zaW4ocmFkaWFucyksXG4gIG54ID0gKGNvcyAqICh4IC0gY3gpKSArIChzaW4gKiAoeSAtIGN5KSkgKyBjeCxcbiAgbnkgPSAoY29zICogKHkgLSBjeSkpIC0gKHNpbiAqICh4IC0gY3gpKSArIGN5O1xuICBcbiAgcmV0dXJuIHsgeDogbngsIHk6IG55IH07XG59XG5cbmZ1bmN0aW9uIHJvdGF0ZVBvaW50KGMsIHAsIGFuZ2xlKSB7XG4gIHJldHVybiByb3RhdGUoYy54LCBjLnksIHAueCwgcC55LCBhbmdsZSk7XG59XG5cbmZ1bmN0aW9uIHJvdGF0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XG4gIHJldHVybiBNYXRoLmF0YW4yKHRhcmdldC55IC0gc291cmNlLnksIHRhcmdldC54IC0gc291cmNlLngpICogMTgwIC8gTWF0aC5QSTtcbn1cblxuZnVuY3Rpb24gc2l6ZSgpIHtcbiAgcmV0dXJuIHtcbiAgICBub2Rlczogbm9kZXMubGVuZ3RoLFxuICAgIHJlbGF0aW9uc2hpcHM6IHJlbGF0aW9uc2hpcHMubGVuZ3RoXG4gIH07XG59XG4vKlxuICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybShlbGVtLCB0cmFuc2xhdGUsIHNjYWxlKSB7XG4gICAgICAgIHZhciBhbmltYXRpb25NaWxsaXNlY29uZHMgPSA1MDAwLFxuICAgICAgICAgICAgdGltZW91dE1pbGxpc2Vjb25kcyA9IDUwLFxuICAgICAgICAgICAgc3RlcHMgPSBwYXJzZUludChhbmltYXRpb25NaWxsaXNlY29uZHMgLyB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc21vb3RoVHJhbnNmb3JtU3RlcChlbGVtLCB0cmFuc2xhdGUsIHNjYWxlLCB0aW1lb3V0TWlsbGlzZWNvbmRzLCAxLCBzdGVwcyk7XG4gICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCwgc3RlcHMpIHtcbiAgICAgICAgdmFyIHByb2dyZXNzID0gc3RlcCAvIHN0ZXBzO1xuXG4gICAgICAgIGVsZW0uYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHRyYW5zbGF0ZVswXSAqIHByb2dyZXNzKSArICcsICcgKyAodHJhbnNsYXRlWzFdICogcHJvZ3Jlc3MpICsgJykgc2NhbGUoJyArIChzY2FsZSAqIHByb2dyZXNzKSArICcpJyk7XG5cbiAgICAgICAgaWYgKHN0ZXAgPCBzdGVwcykge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzbW9vdGhUcmFuc2Zvcm1TdGVwKGVsZW0sIHRyYW5zbGF0ZSwgc2NhbGUsIHRpbWVvdXRNaWxsaXNlY29uZHMsIHN0ZXAgKyAxLCBzdGVwcyk7XG4gICAgICAgICAgICB9LCB0aW1lb3V0TWlsbGlzZWNvbmRzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAqL1xuZnVuY3Rpb24gc3RpY2tOb2RlKGQpIHtcbiAgZC5meCA9IGQzLmV2ZW50Lng7XG4gIGQuZnkgPSBkMy5ldmVudC55O1xufVxuXG5mdW5jdGlvbiB0aWNrKCkge1xuICB0aWNrTm9kZXMoKTtcbiAgdGlja1JlbGF0aW9uc2hpcHMoKTtcbn1cblxuZnVuY3Rpb24gdGlja05vZGVzKCkge1xuICBpZiAobm9kZSkge1xuICAgIG5vZGUuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQueCArICcsICcgKyBkLnkgKyAnKSc7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHMoKSB7XG4gIGlmIChyZWxhdGlvbnNoaXApIHtcbiAgICByZWxhdGlvbnNoaXAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgdmFyIGFuZ2xlID0gcm90YXRpb24oZC5zb3VyY2UsIGQudGFyZ2V0KTtcbiAgICAgIHJldHVybiAndHJhbnNsYXRlKCcgKyBkLnNvdXJjZS54ICsgJywgJyArIGQuc291cmNlLnkgKyAnKSByb3RhdGUoJyArIGFuZ2xlICsgJyknO1xuICAgIH0pO1xuICAgIFxuICAgIHRpY2tSZWxhdGlvbnNoaXBzVGV4dHMoKTtcbiAgICB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCk7XG4gICAgdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRpY2tSZWxhdGlvbnNoaXBzT3V0bGluZXMoKSB7XG4gIHJlbGF0aW9uc2hpcC5lYWNoKGZ1bmN0aW9uKHJlbGF0aW9uc2hpcCkge1xuICAgIHZhciByZWwgPSBkMy5zZWxlY3QodGhpcyksXG4gICAgb3V0bGluZSA9IHJlbC5zZWxlY3QoJy5vdXRsaW5lJyksXG4gICAgdGV4dCA9IHJlbC5zZWxlY3QoJy50ZXh0JyksXG4gICAgYmJveCA9IHRleHQubm9kZSgpLmdldEJCb3goKSxcbiAgICBwYWRkaW5nID0gMztcbiAgICBcbiAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbihkKSB7XG4gICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXG4gICAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXG4gICAgICB0ZXh0Qm91bmRpbmdCb3ggPSB0ZXh0Lm5vZGUoKS5nZXRCQm94KCksXG4gICAgICB0ZXh0UGFkZGluZyA9IDUsXG4gICAgICB1ID0gdW5pdGFyeVZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxuICAgICAgdGV4dE1hcmdpbiA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueCkgKiAwLjUsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtICh0ZXh0Qm91bmRpbmdCb3gud2lkdGggKyB0ZXh0UGFkZGluZykgKiB1LnkpICogMC41IH0sXG4gICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxuICAgICAgcm90YXRlZFBvaW50QTEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCwgeTogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnRCMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnRDMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLngsIHk6IHRleHRNYXJnaW4ueSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnREMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiAwICsgKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IH0sIGFuZ2xlKSxcbiAgICAgIHJvdGF0ZWRQb2ludEEyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSAtIG4ueSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnRCMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcbiAgICAgIHJvdGF0ZWRQb2ludEMyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gbi54ICsgKG4ueCAtIHUueCkgKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgKyAobi55IC0gdS55KSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcbiAgICAgIHJvdGF0ZWRQb2ludEQyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnRFMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCArICgtIG4ueCAtIHUueCkgKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgKyAoLSBuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxuICAgICAgcm90YXRlZFBvaW50RjIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSB1LnggKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSB1LnkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXG4gICAgICByb3RhdGVkUG9pbnRHMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIHRleHRNYXJnaW4ueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSB0ZXh0TWFyZ2luLnkgfSwgYW5nbGUpO1xuICAgICAgXG4gICAgICByZXR1cm4gJ00gJyArIHJvdGF0ZWRQb2ludEExLnggKyAnICcgKyByb3RhdGVkUG9pbnRBMS55ICtcbiAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QjEueCArICcgJyArIHJvdGF0ZWRQb2ludEIxLnkgK1xuICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMS54ICsgJyAnICsgcm90YXRlZFBvaW50QzEueSArXG4gICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQxLnggKyAnICcgKyByb3RhdGVkUG9pbnREMS55ICtcbiAgICAgICcgWiBNICcgKyByb3RhdGVkUG9pbnRBMi54ICsgJyAnICsgcm90YXRlZFBvaW50QTIueSArXG4gICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIyLnggKyAnICcgKyByb3RhdGVkUG9pbnRCMi55ICtcbiAgICAgICcgTCAnICsgcm90YXRlZFBvaW50QzIueCArICcgJyArIHJvdGF0ZWRQb2ludEMyLnkgK1xuICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMi54ICsgJyAnICsgcm90YXRlZFBvaW50RDIueSArXG4gICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEUyLnggKyAnICcgKyByb3RhdGVkUG9pbnRFMi55ICtcbiAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RjIueCArICcgJyArIHJvdGF0ZWRQb2ludEYyLnkgK1xuICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRHMi54ICsgJyAnICsgcm90YXRlZFBvaW50RzIueSArXG4gICAgICAnIFonO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdmVybGF5cygpIHtcbiAgcmVsYXRpb25zaGlwT3ZlcmxheS5hdHRyKCdkJywgZnVuY3Rpb24oZCkge1xuICAgIHZhciBjZW50ZXIgPSB7IHg6IDAsIHk6IDAgfSxcbiAgICBhbmdsZSA9IHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCksXG4gICAgbjEgPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXG4gICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0LCA1MCksXG4gICAgcm90YXRlZFBvaW50QSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwIC0gbi54LCB5OiAwIC0gbi55IH0sIGFuZ2xlKSxcbiAgICByb3RhdGVkUG9pbnRCID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIG4ueSB9LCBhbmdsZSksXG4gICAgcm90YXRlZFBvaW50QyA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCArIG4ueCAtIG4xLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55ICsgbi55IC0gbjEueSB9LCBhbmdsZSksXG4gICAgcm90YXRlZFBvaW50RCA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiAwICsgbi54IC0gbjEueCwgeTogMCArIG4ueSAtIG4xLnkgfSwgYW5nbGUpO1xuICAgIFxuICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QS54ICsgJyAnICsgcm90YXRlZFBvaW50QS55ICtcbiAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIueCArICcgJyArIHJvdGF0ZWRQb2ludEIueSArXG4gICAgJyBMICcgKyByb3RhdGVkUG9pbnRDLnggKyAnICcgKyByb3RhdGVkUG9pbnRDLnkgK1xuICAgICcgTCAnICsgcm90YXRlZFBvaW50RC54ICsgJyAnICsgcm90YXRlZFBvaW50RC55ICtcbiAgICAnIFonO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpIHtcbiAgcmVsYXRpb25zaGlwVGV4dC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgdmFyIGFuZ2xlID0gKHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCkgKyAzNjApICUgMzYwLFxuICAgIG1pcnJvciA9IGFuZ2xlID4gOTAgJiYgYW5nbGUgPCAyNzAsXG4gICAgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXG4gICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcbiAgICBuV2VpZ2h0ID0gbWlycm9yID8gMiA6IC0zLFxuICAgIHBvaW50ID0geyB4OiAoZC50YXJnZXQueCAtIGQuc291cmNlLngpICogMC41ICsgbi54ICogbldlaWdodCwgeTogKGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55KSAqIDAuNSArIG4ueSAqIG5XZWlnaHQgfSxcbiAgICByb3RhdGVkUG9pbnQgPSByb3RhdGVQb2ludChjZW50ZXIsIHBvaW50LCBhbmdsZSk7XG4gICAgXG4gICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIHJvdGF0ZWRQb2ludC54ICsgJywgJyArIHJvdGF0ZWRQb2ludC55ICsgJykgcm90YXRlKCcgKyAobWlycm9yID8gMTgwIDogMCkgKyAnKSc7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiB0b1N0cmluZyhkKSB7XG4gIHZhciBzID0gZC5sYWJlbHMgPyBkLmxhYmVsc1swXSA6IGQudHlwZTtcbiAgXG4gIHMgKz0gJyAoPGlkPjogJyArIGQuaWQ7XG4gIFxuICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgICBzICs9ICcsICcgKyBwcm9wZXJ0eSArICc6ICcgKyBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKTtcbiAgfSk7XG4gIFxuICBzICs9ICcpJztcbiAgXG4gIHJldHVybiBzO1xufVxuXG5mdW5jdGlvbiB1bml0YXJ5Tm9ybWFsVmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcbiAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxuICB2ZWN0b3IgPSB1bml0YXJ5VmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpO1xuICBcbiAgcmV0dXJuIHJvdGF0ZVBvaW50KGNlbnRlciwgdmVjdG9yLCA5MCk7XG59XG5cbmZ1bmN0aW9uIHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCkge1xuICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KE1hdGgucG93KHRhcmdldC54IC0gc291cmNlLngsIDIpICsgTWF0aC5wb3codGFyZ2V0LnkgLSBzb3VyY2UueSwgMikpIC8gTWF0aC5zcXJ0KG5ld0xlbmd0aCB8fCAxKTtcbiAgXG4gIHJldHVybiB7XG4gICAgeDogKHRhcmdldC54IC0gc291cmNlLngpIC8gbGVuZ3RoLFxuICAgIHk6ICh0YXJnZXQueSAtIHNvdXJjZS55KSAvIGxlbmd0aCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlV2l0aEQzRGF0YShkM0RhdGEpIHtcbiAgdXBkYXRlTm9kZXNBbmRSZWxhdGlvbnNoaXBzKGQzRGF0YS5ub2RlcywgZDNEYXRhLnJlbGF0aW9uc2hpcHMpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVXaXRoTmVvNGpEYXRhKG5lbzRqRGF0YSkge1xuICB2YXIgZDNEYXRhID0gbmVvNGpEYXRhVG9EM0RhdGEobmVvNGpEYXRhKTtcbiAgdXBkYXRlV2l0aEQzRGF0YShkM0RhdGEpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcbiAgY2xlYXJJbmZvKCk7XG4gIFxuICBpZiAoZC5sYWJlbHMpIHtcbiAgICBhcHBlbmRJbmZvRWxlbWVudENsYXNzKCdjbGFzcycsIGQubGFiZWxzWzBdKTtcbiAgfSBlbHNlIHtcbiAgICBhcHBlbmRJbmZvRWxlbWVudFJlbGF0aW9uc2hpcCgnY2xhc3MnLCBkLnR5cGUpO1xuICB9XG4gIFxuICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XG4gIFxuICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcbiAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsIHByb3BlcnR5LCBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVOb2RlcyhuKSB7XG4gIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG5vZGVzLCBuKTtcbiAgXG4gIG5vZGUgPSBzdmdOb2Rlcy5zZWxlY3RBbGwoJy5ub2RlJylcbiAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZDsgfSk7XG4gIHZhciBub2RlRW50ZXIgPSBhcHBlbmROb2RlVG9HcmFwaCgpO1xuICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVOb2Rlc0FuZFJlbGF0aW9uc2hpcHMobiwgcikge1xuICB1cGRhdGVSZWxhdGlvbnNoaXBzKHIpO1xuICB1cGRhdGVOb2RlcyhuKTtcbiAgXG4gIHNpbXVsYXRpb24ubm9kZXMobm9kZXMpO1xuICBzaW11bGF0aW9uLmZvcmNlKCdsaW5rJykubGlua3MocmVsYXRpb25zaGlwcyk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMocikge1xuICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyZWxhdGlvbnNoaXBzLCByKTtcbiAgXG4gIHJlbGF0aW9uc2hpcCA9IHN2Z1JlbGF0aW9uc2hpcHMuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwJylcbiAgICAuZGF0YShyZWxhdGlvbnNoaXBzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkOyB9KTtcbiAgXG4gIHZhciByZWxhdGlvbnNoaXBFbnRlciA9IGFwcGVuZFJlbGF0aW9uc2hpcFRvR3JhcGgoKTtcbiAgXG4gIHJlbGF0aW9uc2hpcCA9IHJlbGF0aW9uc2hpcEVudGVyLnJlbGF0aW9uc2hpcC5tZXJnZShyZWxhdGlvbnNoaXApO1xuICBcbiAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHN2Zy5zZWxlY3RBbGwoJy5yZWxhdGlvbnNoaXAgLm91dGxpbmUnKTtcbiAgcmVsYXRpb25zaGlwT3V0bGluZSA9IHJlbGF0aW9uc2hpcEVudGVyLm91dGxpbmUubWVyZ2UocmVsYXRpb25zaGlwT3V0bGluZSk7XG4gIFxuICByZWxhdGlvbnNoaXBPdmVybGF5ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3ZlcmxheScpO1xuICByZWxhdGlvbnNoaXBPdmVybGF5ID0gcmVsYXRpb25zaGlwRW50ZXIub3ZlcmxheS5tZXJnZShyZWxhdGlvbnNoaXBPdmVybGF5KTtcbiAgXG4gIHJlbGF0aW9uc2hpcFRleHQgPSBzdmcuc2VsZWN0QWxsKCcucmVsYXRpb25zaGlwIC50ZXh0Jyk7XG4gIHJlbGF0aW9uc2hpcFRleHQgPSByZWxhdGlvbnNoaXBFbnRlci50ZXh0Lm1lcmdlKHJlbGF0aW9uc2hpcFRleHQpO1xufVxuXG5mdW5jdGlvbiB2ZXJzaW9uKCkge1xuICByZXR1cm4gVkVSU0lPTjtcbn1cblxuZnVuY3Rpb24gem9vbUZpdCh0cmFuc2l0aW9uRHVyYXRpb24pIHtcbiAgdmFyIGJvdW5kcyA9IHN2Zy5ub2RlKCkuZ2V0QkJveCgpLFxuICBwYXJlbnQgPSBzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudCxcbiAgZnVsbFdpZHRoID0gcGFyZW50LmNsaWVudFdpZHRoLFxuICBmdWxsSGVpZ2h0ID0gcGFyZW50LmNsaWVudEhlaWdodCxcbiAgd2lkdGggPSBib3VuZHMud2lkdGgsXG4gIGhlaWdodCA9IGJvdW5kcy5oZWlnaHQsXG4gIG1pZFggPSBib3VuZHMueCArIHdpZHRoIC8gMixcbiAgbWlkWSA9IGJvdW5kcy55ICsgaGVpZ2h0IC8gMjtcbiAgXG4gIGlmICh3aWR0aCA9PT0gMCB8fCBoZWlnaHQgPT09IDApIHtcbiAgICByZXR1cm47IC8vIG5vdGhpbmcgdG8gZml0XG4gIH1cbiAgXG4gIHN2Z1NjYWxlID0gMC44NSAvIE1hdGgubWF4KHdpZHRoIC8gZnVsbFdpZHRoLCBoZWlnaHQgLyBmdWxsSGVpZ2h0KTtcbiAgc3ZnVHJhbnNsYXRlID0gW2Z1bGxXaWR0aCAvIDIgLSBzdmdTY2FsZSAqIG1pZFgsIGZ1bGxIZWlnaHQgLyAyIC0gc3ZnU2NhbGUgKiBtaWRZXTtcbiAgXG4gIHN2Zy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyBzdmdUcmFuc2xhdGVbMF0gKyAnLCAnICsgc3ZnVHJhbnNsYXRlWzFdICsgJykgc2NhbGUoJyArIHN2Z1NjYWxlICsgJyknKTtcbiAgLy8gICAgICAgIHNtb290aFRyYW5zZm9ybShzdmdUcmFuc2xhdGUsIHN2Z1NjYWxlKTtcbn1cblxuaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKTtcblxucmV0dXJuIHtcbiAgYXBwZW5kUmFuZG9tRGF0YVRvTm9kZTogYXBwZW5kUmFuZG9tRGF0YVRvTm9kZSxcbiAgbmVvNGpEYXRhVG9EM0RhdGE6IG5lbzRqRGF0YVRvRDNEYXRhLFxuICByYW5kb21EM0RhdGE6IHJhbmRvbUQzRGF0YSxcbiAgc2l6ZTogc2l6ZSxcbiAgdXBkYXRlV2l0aEQzRGF0YTogdXBkYXRlV2l0aEQzRGF0YSxcbiAgdXBkYXRlV2l0aE5lbzRqRGF0YTogdXBkYXRlV2l0aE5lbzRqRGF0YSxcbiAgdmVyc2lvbjogdmVyc2lvblxufTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBOZW80akQzO1xuIl19
