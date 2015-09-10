var goalHash = {
  algorithm: "Algorithm Practice",
  logic: "Logic Problems",
  esperanto: "Learn Esperanto",
  web: "Web Development Lessons",
  "pull-ups": "Pull Ups",
  "review-design-patterns": "Review Design Patterns"
};

var constructGoalWidget = function (slug) {
  var string = "<iframe src='https://www.beeminder.com/widget?slug=" +
  slug + "&username=jvirissimo' height='195px' width='250px'" +
  "frameborder='0px' ></iframe>";

  return string;
}

var constructGoalWidgetTitle = function (title) {
  var string = "<p class='card-title black-text center-align'>" +
  title + "</p>";

  return string;
}

var constructGoalWidgetCard = function (title, slug) {
  var string = "<div id='" + slug + "'" +
    " class='col s12 m6 l3'>" +
    "<div class='card'>" +
    "<div class='card-content'>" +
    constructGoalWidgetTitle(title) +
    constructGoalWidget(slug) +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>";

    return string;
}

var addGoalWidgetCard = function (title, slug) {
  $('#goal-widgets').append(constructGoalWidgetCard(title, slug));
  var id = "#" + slug;
  Materialize.fadeInImage(id);
}

var addAllGoalWidgetCards = function () {
  Object.keys(goalHash).forEach(function (key) {
    var value = goalHash[key]
    addGoalWidgetCard(value, key);
  })
}
