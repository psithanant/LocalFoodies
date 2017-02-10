/*jshint esversion: 6 */

function getOrPrompt(lsKeyValue) {
  var valInStorage = localStorage.getItem(lsKeyValue);

  if (!valInStorage) {
    valInStorage = prompt(`Enter a value for ${lsKeyValue}`);
    localStorage.setItem(lsKeyValue, valInStorage);
  }

  return valInStorage;
}

const yelpAuth = {
  consumerKey: 'CfxCq9d7cnVvmzkW791FJQ',
  consumerSecret: getOrPrompt('Yelp Consumer Secret'),
  accessToken: 'ST-AcwH5ihkoTYmZSBaW8R77vYDe4mnD',
  accessTokenSecret: getOrPrompt('Yelp Access Token Secret'),
  serviceProvider: {
    //Yelp API Documentation
    signatureMethod: 'HMAC-SHA1'
  }
};

const token = prompt('enter Google token');

const googleKey = getOrPrompt('Google Key');

let scriptTag = document.createElement('script');
   scriptTag.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}`;
   document.body.append(scriptTag);

//Yelp API Documentation
const yelpAccessor = {
  consumerSecret: yelpAuth.consumerSecret,
  tokenSecret: yelpAuth.accessTokenSecret
};

//converting Yelp Rating to stars rating
const toStars = function(rating) {
  let count = 0;
  let star = "";
  while (count < rating) {
    count++;
    star += "☆";
  }
  return star;
};

const renderPlaces = function(places) {
  //for each result, make these divs
  $('#searchResults').empty();
  const $row = $('div').addClass('row');
  for (const place of places) {
    const $col = $('<div>').addClass('col s3');
    const $card = $('<div>').addClass('card hoverable');
    const $content = $('<div>').addClass('card-content center');
    //making a variable, an element tag, and gives it a className
      //card details
    const $title = $('<span>').addClass('card-title truncate').text(place.name);
    const $photoOfFood = $('<img>').addClass('activator');
    const $stars = $('<p>').addClass('stars').text(toStars(place.rating));
    const $details = $('<p>').addClass('foodtype').text(place.foodType);
    const $map = $('<div>').css('height', '100px');
    //reveal
    const $reveal = $('<div>').addClass('card-reveal');
    const $area = $('<h6>').addClass('area').text(place.area);
    const $span = $('<span>').addClass('card-title grey-text text-darken-4').text('Top Review: ');
    const $i = $('<i>').addClass('material-icons right').text('close');
    const $p = $('<p>').text(place.review);
    const $snippetPhotos = $('<img>');

    $snippetPhotos.attr({
      src: place.snippetImage,
      alt: `${place.snippetImage}`
    })

    $photoOfFood.attr({
      src: place.photoOfFood,
      alt: `${place.photoOfFood}`
    });

    $title.attr('id', 'title');

    initMap(place, $map[0]);
    $('#searchResults').append($col);
    $card.append($content, $map, $reveal);
    $reveal.append($span, $p);
    $span.append($i);
    $p.append($title);
    $col.append($card);
    $content.append($title, $stars, $details, $photoOfFood);
  }
};

// 1. Google Translate API
$("form").submit(function() {
  event.preventDefault();
  $.ajax({
    url: "https://translation.googleapis.com/language/translate/v2",
    data: {
      'q': $('#find').val(),
      'target': 'en',
      'format': 'text'
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    success: translationDone
  });
});

// 2. passing translated text to Yelp
function translationDone(response) {
  console.log(response);
  var terms = response.data.translations[0].translatedText;
  var near = 'San+Francisco';
  //adding parameters
  var parameters = [];
  parameters.push(['term', terms]);
  parameters.push(['location', near]);
  parameters.push(['callback', 'cb']);
  //requirement from Yelp to get the right access
  parameters.push(['oauth_consumer_key', yelpAuth.consumerKey]);
  parameters.push(['oauth_consumer_secret', yelpAuth.consumerSecret]);
  parameters.push(['oauth_token', yelpAuth.accessToken]);
  parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

  let message = {
    'action': 'https://api.yelp.com/v2/search',
    'method': 'GET',
    'parameters': parameters
  };
  //signature allowing the request (Yelp Documentation)
  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, yelpAccessor);
  //code from Github example on working with YELP API using javascript instead of backend
  let parameterMap = OAuth.getParameterMap(message.parameters);

  $.ajax({
      //Yelp API Documentation
      'url': message.action,
      'data': parameterMap,
      'dataType': 'jsonp',
      'jsonpCallback': 'cb',
      'cache': true
    })
    .done(function(response) {
      console.log(response);
      const results = [];
      if (response.businesses.length > 0) {
        for (const data of response.businesses) {
          results.push({
            name: data.name,
            photoOfFood: data.image_url,
            rating: data.rating,
            area: data.location.neighborhoods[0],
            foodType: data.categories[0][0],
            latitude: data.location.coordinate.latitude,
            longitude: data.location.coordinate.longitude,
            review: data.snippet_text,
            snippetImage: data.snippet_image_url
          });
        }
        console.log(results[0].foodType);
        renderPlaces(results);
      } else {
        $('#searchResults').html("Sorry! We can't find what you're looking for");
      }
  });
}

//getting Google Maps API
function initMap(result, elem) {
  let where = {lat: result.latitude, lng: result.longitude};
  let map = new google.maps.Map(elem, {
    zoom: 13,
    center: where
  });
  let marker = new google.maps.Marker({
    position: where,
    map: map
  });
}
