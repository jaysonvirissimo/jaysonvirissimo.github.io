var wakeUpTheServer = function() {
  $.ajax({
    url: 'https://virissimo-homebase.herokuapp.com/awaken',
    dataType: 'json',
    timeout: 10000,
    success: function(data) {
      console.log(data['message']);
    },
    error: function() {
      console.log("The server didn't wake up in a reasonable amount of time.");
    }
  });
};
