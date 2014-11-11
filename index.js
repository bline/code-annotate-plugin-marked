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
  var path = require('path');
  var util = require('util');
  var plugin = require('code-annotate/plugin');
  var marked = require('marked');

  function Marked(annotate) {
    plugin.apply(this, arguments);
    this.highlighter = function (lang, code) {
      return (new marked.Renderer()).code(code, lang);
    };
    this.anno.plugins.on('plugin-highlighter', function (highlighter) {
      this.highlighter = highlighter.highlight.bind(highlighter); }.bind(this));
  }
  util.inherits(Marked, plugin);
  Marked.name = 'marked';
  Marked.defaults = {
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false
  };

  Marked.prototype.init = function (opt) {
    var that = this, allMarkdown = '', allSections = [];
    plugin.prototype.init.apply(this, arguments);
    this.anno.on('section', function (section) {
      allSections.push(section);
      allMarkdown += section.docsText + '\n\n';
    });
    this.anno.on('files', function (files) {
      var links = marked.lexer(allMarkdown, this.opt).links;
      allSections.forEach(function (section) {
        this.markedSection(section, links);
      }.bind(this));
    }.bind(this));
  };
  Marked.prototype.markedSection = function (section, links) {
    var config, lexer, tokens;
    lexer = new marked.Lexer();
    lexer.tokens.links = links;
    tokens = lexer.lex(section.docsText, this.opt);
    tokens.forEach(function (token) {
      var lineMatch, lang = token.lang, line;
      if (token.type === 'code') {
        lineMatch = /^(\w+):(\d+)$/.exec(lang);
        if (lineMatch) {
          lang = lineMatch[1];
          line = parseInt(lineMatch[2], 10);
        }
        token.text = this.highlighter(lang, token.text, line);
        token.escaped = true;
      }
    }.bind(this));
    section.docsHl = marked.Parser.parse(tokens, config);
  };
  module.exports = Marked;
})();
