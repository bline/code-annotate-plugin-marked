/*
 * Copyright (C) 2014 Scott Beck, all rights reserved
 *
 * Licensed under the MIT license
 *
 */
// # code-annotate-plugin-marked
// markup comments in [code-annotate](https://github.com/bline/code-annotate)
// with [marked](https://github.com/chjj/marked)
(function () {
  'use strict';
  var _ = require('lodash');
  var marked = require('marked');
  var debug = require('debug')('code-annotate:marked');

  function Marked() {
    Marked.super_.apply(this, arguments);
  }
  module.exports = require('code-annotate-plugin-base').extend({
    name: 'marked',
    isFileFormatter: true,
    Plugin: Marked
  });
  Marked.defaultOptions = {
    tokSkipFirst: true,
    tocOmit: [],

    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
  };

  Marked.prototype.formatFile = function (annotation, callback) {
    var links, allMarkdown = '', files = annotation.file,
      on = outcome.error(callback);
      opt = this.loader.params('marked');
    this.loader.loadModule({isCodeHighlighter: true}, on.success(function (service) {
      that.highlighter = service.highlight.bind(service);
      files.forEach(function (file) {
        file.sections.forEach(function (section) {
          allMarkdown += section.docsText + '\n\n';
        });
      });
      links = marked.lexer(allMarkdown, opt).links;
      async.each(files, function (file, next) {
        async.each(file.sections, function (section, next) {
          that.markedSection(section, links, next);
        }, next);
      }, callback);
    }));
  };
  Marked.prototype.filterTOC = function (text) {
    var opt = this.loader.params('marked');
    if (!_.isArray(opt.tocOmit))
      opt.tocOmit = [opt.tocOmit];

    var omit = ['TOC', 'TABLE OF CONTENTS']
      .concat(opt.tocOmit)
      .map(function (txt) {
        return txt.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');})
      .join('|');
    var re = new RegExp("(?:" + omit + ')');
    return re.test(text);
  };
  Marked.prototype.markedSection = function (section, links, next) {
    var config, lexer, tokens, file = section.file,
      opt = this.loader.params('marked');
    if (!file.makredToc) file.markedToc = [];

    lexer = new marked.Lexer();
    lexer.tokens.links = links;
    tokens = lexer.lex(section.docsText, this.opt);
    tokens.forEach(function (token, i) {
      var lineMatch, lang = token.lang, line, depth, id;
      if (token.type === 'code') {
        lineMatch = /^(\w+):(\d+)$/.exec(lang);
        if (lineMatch) {
          lang = lineMatch[1];
          line = parseInt(lineMatch[2], 10);
        }
        token.text = this.highlighter(lang, token.text, line);
        token.escaped = true;
      } else if (token.type === 'heading' && !this.filterTOC(token.text)) {
        if (i === 0 && opt.tocSkipFirst === true)
          return;
        depth = token.depth;
        if (opt.tocSkipFirst && depth != 0)
          depth--;
        id = token.text.toLowerCase().replace(/[^\w]+/g, '-');
        file.markedToc.push({ id: id, heading: token.text, depth: depth });
      }
    }.bind(this));
    section.markedRendered = marked.Parser.parse(tokens, config);
    next();
  };
})();
