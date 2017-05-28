function setMajorClassification() {
  $.ajax({
    url: 'json/majorClassification',
    type: "get",
    dataType: "JSON",
    success: function(data) {
      var appendHtml = '';
      console.log(data);
      $.each(data, function(key, rec) {
        appendHtml += '<option value="' + rec.id + '">' + rec.chn_name + '(' + rec.kor_name + ')' + '</option>'
      });
      console.log(appendHtml);
      $('#goods_major_classification').html(appendHtml);
      setSubClassification();
    },
    error: function(xhr, status, error) {
      console.log(xhr);
      console.log(status);
      console.log(error);
    }
  });
}

function setSubClassification() {
  $.ajax({
    url: 'json/subClassification',
    type: "get",
    data: {
      majorClassification: $('#goods_major_classification').val()
    },
    dataType: "JSON",
    success: function(data) {
      var appendHtml = '';
      console.log(data);
      $.each(data, function(key, rec) {
        appendHtml += '<option value="' + rec.id + '">' + rec.chn_name + '(' + rec.kor_name + ')' + '</option>'
      });
      console.log(appendHtml);
      $('#goods_sub_classification').html(appendHtml);
    },
    error: function(xhr, status, error) {
      console.log(xhr);
      console.log(status);
      console.log(error);
    }
  });
}

function topImageFormAdd() {
  var html = '<input type="file" name="top_image">';
  $('.top_iamge_add_form').append(html);
}

function infoImageFormAdd() {
  var html = '<input type="file" name="info_image">';
  $('.info_iamge_add_form').append(html);
}
