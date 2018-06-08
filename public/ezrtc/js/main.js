function main() {
  function message(text, type, stick) {
    type = type === null ? null : type || 'info'
    var delay = stick ? 0 : 5000

    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ', text);

    if (type !== null) {
      var notify = $.notify({
          message: text
        },
        {
          type: type,
          animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
          },
          placement: {
            from: 'top',
            align: 'center'
          },
          delay: delay,
          allow_dismiss: !stick
        });

      if (typeof stick === 'string') {
        notifies[stick] = notify;
      }
    }
  }

  var $formConnect = $('form[data-id="form-connect"]');
  var $formSend = $('form[data-id="form-send"]').hide();
  var notifies = {}

  $formConnect.on('submit', function(e){

    $formConnect.find('button').text('Connecting...').prop( "disabled", true )

    message('Connecting to pairing server', null);

    setTimeout(function(){
      message('Connected to pairing server. Waiting for other candidate...', 'warning', 'waitingCandidate');

    }, 1000)

    setTimeout(function(){
      message('Candidate connected', 'success')
      if (notifies['waitingCandidate']) notifies['waitingCandidate'].close()
    }, 4000)

    e.preventDefault()
  })

}

$(document).ready(main)