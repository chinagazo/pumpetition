import firebase from 'firebase';

var SetTime = 10; // 최초 설정 시간(기본 : 초)
var check = 1;
function msg_time() {
  // 1초씩 카운트
  m = (SetTime % 60) + '초'; // 남은 시간 계산
  var msg = m;
  document.all.ViewTimer.innerHTML = msg; // div 영역에 보여줌
  SetTime--; // 1초씩 감소
  if (SetTime < 0) {
    // 시간이 종료 되었으면..
    // 타이머 해제
    if (check != 0) {
      //alert("시작");
      firebase.database().ref('battle/p1').set(0);
      firebase.database().ref('battle/p2').set(0);
    }
    SetTime = 30;
    check = check - 1;
  }
  if (check == -1) {
    clearInterval(tid);
    if ($('#OneP_c').html() > $('#TwoP_c').html()) {
      alert('Player 1! ' + $('#OneP_c').html());
    } else {
      alert('Player 2! ' + $('#TwoP_c').html());
    }
  }
}
window.onload = function TimerStart() {
  tid = setInterval('msg_time()', 1000);
};
