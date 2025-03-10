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

function resizeIframe(iframe) {
    iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
}

// For dynamically resizing when content changes
window.addEventListener('resize', function() {
    var iframe = document.getElementById('contentFrame');
    resizeIframe(iframe);
});