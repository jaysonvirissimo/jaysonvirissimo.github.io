var removeUglyHeadings = function () {
  $('#books h2').children('a').remove()
}

var removeUglyLinks = function () {
  $('a.gr_grid_branding').remove()
}

var removeProgressBar = function () {
  $('.progress').remove()
}

var showWidgets = function () {
  $('.widget').css('display', 'block')
}