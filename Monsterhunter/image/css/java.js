$(function() {
$('.item-demo').on('click',function(){
    $('.popup-demo').addClass('popup-show').fadeIn();
});
$('.close').on('click',function(){
    $('.popup-demo').fadeOut();
});
});


$(".inline").colorbox({
     inline:true,
     rel:'group'
});



//任意のタブにURLからリンクするための設定
function GethashID (hashIDName){
  if(hashIDName){
    //タブ設定
    $('.tab li').find('a').each(function() { //タブ内のaタグ全てを取得
      var idName = $(this).attr('href'); //タブ内のaタグのリンク名（例）#lunchの値を取得 
      if(idName == hashIDName){ //リンク元の指定されたURLのハッシュタグ（例）http://example.com/#lunch←この#の値とタブ内のリンク名（例）#lunchが同じかをチェック
        var parentElm = $(this).parent(); //タブ内のaタグの親要素（li）を取得
        $('.tab li').removeClass("active"); //タブ内のliについているactiveクラスを取り除き
        $(parentElm).addClass("active"); //リンク元の指定されたURLのハッシュタグとタブ内のリンク名が同じであれば、liにactiveクラスを追加
        //表示させるエリア設定
        $(".area").removeClass("is-active"); //もともとついているis-activeクラスを取り除き
        $(hashIDName).addClass("is-active"); //表示させたいエリアのタブリンク名をクリックしたら、表示エリアにis-activeクラスを追加 
      }
    });
  }
}

//タブをクリックしたら
$('.tab a').on('click', function() {
  var idName = $(this).attr('href'); //タブ内のリンク名を取得  
  GethashID (idName);//設定したタブの読み込みと
  return false;//aタグを無効にする
});


// 上記の動きをページが読み込まれたらすぐに動かす
$(window).on('load', function () {
    $('.tab li:first-of-type').addClass("active"); //最初のliにactiveクラスを追加
    $('.area:first-of-type').addClass("is-active"); //最初の.areaにis-activeクラスを追加
  var hashName = location.hash; //リンク元の指定されたURLのハッシュタグを取得
  GethashID (hashName);//設定したタブの読み込み
});




        $(document).on('lity:open', function(event, instance) {
            let currentImage = instance.element();
            let images = $('.gallery a');
            let currentIndex = images.index(currentImage);
            
            let updateImage = function(index) {
                let newImage = $(images[index]).attr('href');
                instance.element().attr('href', newImage).find('img').attr('src', newImage);
            };
            
            instance.element().on('click', '.lity-close, .lity-prev, .lity-next', function(event) {
                let direction = $(event.target).is('.lity-prev') ? -1 : 1;
                currentIndex = (currentIndex + direction + images.length) % images.length;
                updateImage(currentIndex);
                event.preventDefault();
            });
        });