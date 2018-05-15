(function(angular) {
    'use strict';

    function MirrorCtrl(
            AnnyangService,
            GeolocationService,
            WeatherService,
            MapService,
            CalendarService,
            TrafficService,
            SubwayService,
            YoutubeService,
            $scope, $timeout, $interval, $sce) {
    	
        var _this = this;
        var command = COMMANDS.ko;
        var functionService = FUNCTIONSERVICE;
        var DEFAULT_COMMAND_TEXT = command.default;
        var PHOTO_INDEX=0;
        var VIDEO_INDEX=0;
        $scope.listening = false;
        $scope.complement = command.hi;
        $scope.debug = false;
        $scope.focus = "default";
        $scope.greetingHidden = "true";
        $scope.user = {};
        $scope.interimResult = DEFAULT_COMMAND_TEXT;
        
        /** Smart Mirror IP */
        var os = require('os');
        var networkInterfaces = os.networkInterfaces();
        $scope.ipAddress = networkInterfaces.wlan0[0].address;

        /** Sound Cloud Service */
        /*
        SC.initialize({
        	client_id : config.soundcloud.key
        });
        
        $scope.musicplay = null;
        SC.stream('/tracks/1').then(function(player){
        	$scope.musicplay = player
        	//player.play();
        });
        */
        
        // Update the time
        function updateTime(){
            $scope.date = new Date();
        }

        // Reset the command text
        var restCommand = function(){
          $scope.interimResult = DEFAULT_COMMAND_TEXT;
        }

        _this.init = function() {
        	$scope.map = MapService.generateMap("Seoul,Korea");
            var tick = $interval(updateTime, 1000); // 1초 마다
            updateTime();

            GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                console.log("Geoposition", geoposition);
                $scope.map = MapService.generateMap(geoposition.coords.latitude+','+geoposition.coords.longitude);
            });
            restCommand();

            var refreshMirrorData = function() {
                //Get our location and then get the weather for our location
                GeolocationService.getLocation({enableHighAccuracy: true}).then(function(geoposition){
                    console.log("Geoposition", geoposition);
                    WeatherService.init(geoposition).then(function() {
                        $scope.currentForcast = WeatherService.currentForcast();
                        $scope.weeklyForcast = WeatherService.weeklyForcast();
                        $scope.hourlyForcast = WeatherService.hourlyForcast();
                        console.log("Current", $scope.currentForcast);
                        console.log("Weekly", $scope.weeklyForcast);
                        console.log("Hourly", $scope.hourlyForcast);
                    });
                }, function(error){
                    console.log(error);
                });

                CalendarService.getCalendarEvents().then(function(response) {
                    $scope.calendar = CalendarService.getFutureEvents();
                }, function(error) {
                    console.log(error);
                });

                $scope.greeting = config.greeting[Math.floor(Math.random() * config.greeting.length)];
            };

            refreshMirrorData();
            $interval(refreshMirrorData, 3600000);

            var refreshTrafficData = function() {
                TrafficService.getTravelDuration().then(function(durationTraffic) {
                    console.log("Traffic", durationTraffic);
                    $scope.traffic = {
                        name:config.traffic.name,
                        origin: config.traffic.origin,
                        destination : config.traffic.destination,
                        hours : durationTraffic.hours(),
                        minutes : durationTraffic.minutes()
                    };
                }, function(error){
                    $scope.traffic = {error: error};
                });
            };


            refreshTrafficData();
            $interval(refreshTrafficData, config.traffic.reload_interval * 60000);

            var defaultView = function() {
            	functionService.defaultHome($scope);
            }

            AnnyangService.addCommand(command.whois,function() {
            	functionService.whoIsSmartMirror($scope);
            });
            
            AnnyangService.addCommand(command.whatcanisay, function() {
               functionService.whatCanISay($scope);
            });

            AnnyangService.addCommand(command.home, defaultView);
		
            AnnyangService.addCommand(command.sleep, function() {
            	functionService.goSleep($scope);
            });

            AnnyangService.addCommand(command.wake, function() {
            	functionService.wake($scope);
            });

            AnnyangService.addCommand(command.debug, function() {
                console.debug("Boop Boop. Showing debug info...");
                $scope.debug = true;
            });

            AnnyangService.addCommand(command.map, function() {
                functionService.map($scope,GeolocationService,MapService);
             });

            AnnyangService.addCommand(command.locaiton, function(location) {
            	console.debug("Getting map of", location);
                $scope.map = MapService.generateMap(location);
                $scope.focus = "map";
            });

            AnnyangService.addCommand(command.zoomin, function() {
                console.debug("Zoooooooom!!!");
                $scope.map = MapService.zoomIn();
            });

            AnnyangService.addCommand(command.zoomout, function() {
                console.debug("Moooooooooz!!!");
                $scope.map = MapService.zoomOut();
            });

            AnnyangService.addCommand(command.zoomvalue, function(value) {
                console.debug("Moooop!!!", value);
                $scope.map = MapService.zoomTo(value);
            });

            AnnyangService.addCommand(command.zoomreset, function() {
                console.debug("Zoooommmmmzzz00000!!!");
                $scope.map = MapService.reset();
                $scope.focus = "map";
            });


            AnnyangService.addCommand(command.playyoutube, function(term) {
              YoutubeService.getYoutube(term,'video').then(function(){
                if(term){
                  var videoId = YoutubeService.getVideoId()
                  $scope.focus = "youtube";
                  $scope.youtubeurl = "http://www.youtube.com/embed/" + videoId + "?autoplay=1&enablejsapi=1&version=3&playerapiid=ytplayer"
                  $scope.currentYoutubeUrl = $sce.trustAsResourceUrl($scope.youtubeurl);
                }
              });
            });

            AnnyangService.addCommand(command.ytbplaylist, function(term) {
              YoutubeService.getYoutube(term,'playlist').then(function(){
                if(term){
                  var playlistId = YoutubeService.getPlaylistId()
                  $scope.focus = "youtube";
                  $scope.youtubeurl = "http://www.youtube.com/embed?autoplay=1&listType=playlist&enablejsapi=1&version=3&list="+playlistId
                  $scope.currentYoutubeUrl = $sce.trustAsResourceUrl($scope.youtubeurl);
                }
              });
            });

            AnnyangService.addCommand(command.stopyoutube, function() {
              var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
              iframe.postMessage('{"event":"command","func":"' + 'stopVideo' +   '","args":""}', '*');
              $scope.focus = "default";
            });

            AnnyangService.addCommand(command.subway, function(station,linenumber,updown) {
              SubwayService.init(station).then(function(){
                SubwayService.getArriveTime(linenumber,updown).then(function(data){
                  if(data != null){
                    $scope.subwayinfo1 = data[1].ARRIVETIME + "에 " + data[1].SUBWAYNAME + "행 열차";
                    $scope.subwayinfo2 = data[2].ARRIVETIME + "에 " + data[2].SUBWAYNAME + "행 열차";
                    $scope.subwayinfo3 = data[3].ARRIVETIME + "에 " + data[3].SUBWAYNAME + "행 열차";
                    $scope.subwayinfo4 = data[4].ARRIVETIME + "에 " + data[4].SUBWAYNAME + "행 열차";
             
                    if(responsiveVoice.voiceSupport()) {
                    	responsiveVoice.speak(data[1].ARRIVETIME + "에 " + data[1].SUBWAYNAME + "행 열차가 있습니다. 이어서,"+data[2].ARRIVETIME + "에 " + data[2].SUBWAYNAME + "행 열차가 있습니다.","Korean Female");
                    }
                  }else{
                    $scope.subwayinfo = "운행하는 열차가 존재 하지 않습니다.";
                  }
                  $scope.focus = "subway";
                });
              });
            });
            
            AnnyangService.addCommand(command.news, function() {
            	functionService.news($scope);
            });

            AnnyangService.addCommand(command.photo, function() {
            	functionService.photo(PHOTO_INDEX);
            	PHOTO_INDEX++;
            });

            AnnyangService.addCommand(command.video, function() {
            	functionService.video(VIDEO_INDEX);
        		VIDEO_INDEX++;
            });
            
            AnnyangService.addCommand(command.musicplay,function(state,action) {
            	console.log("음악 시작");
            	$scope.musicplay.play(); // 음악 시작
            	
            });
            
            AnnyangService.addCommand(command.musicplay,function(state,action) {
            	console.log("음악 정지");
            	$scope.musicplay.pause(); // 음악 정지
            });
            */
        
            var sender = require('remote').getGlobal('sender');
     	    sender.on('android',function(android){
     	    	$scope.interimResult = android.command; 
	    		console.log("Android Command :: "+android.command);
	    		var androidCommand = android.command+"";
	    		
    			if(androidCommand === command.sleep) { functionService.goSleep($scope);}
    			else if(androidCommand === command.whois) { functionService.whoIsSmartMirror($scope); }
    			else if(androidCommand === command.home) { functionService.defaultHome($scope); }  
    			else if(androidCommand === command.wake) { functionService.wake($scope); }
    			else if(androidCommand === command.whatcanisay) { functionService.whatCanISay($scope); }
    			else if(androidCommand === command.map) { functionService.map($scope,GeolocationService,MapService); }
    			else if(androidCommand === command.news) { functionService.news($scope); }
    			else if(androidCommand === command.photo) { functionService.photo(); }
    			else if(androidCommand === command.video) { functionService.video(); }
    			else if(androidCommand === command.lighton) { functionService.lightOn();}
    			else if(androidCommand === command.lightoff) { functionService.lightOff();}
    			
    			var locationExist = androidCommand.indexOf("위치");
	    		if(locationExist != -1) {
	    			var locationValue = androidCommand.split("위치");
	    			console.log(locationValue[0]);
	    			functionService.location(locationValue[0],$scope,GeolocationService,MapService);
	    		}
	    		
	    		var youtubeExist = androidCommand.indexOf("동영상");
	    		if(youtubeExist != -1) {
	    			if(androidCommand === "동영상 정지") {
	    				functionService.stopYoutube($scope);
	    			}else {
		    			var youtubeValue = androidCommand.split("동영상");
		    			console.log(youtubeValue[0]);
		    			functionService.playYoutube(youtubeValue[0],$scope,$sce,YoutubeService);
	    			}
     	    	}
	    		
	    		var subwayExist = androidCommand.indexOf("역");
	    		if(subwayExist != -1) {
	    			var temp1 = androidCommand.split("역");
	    			var temp2 = temp1[1].split("호선");
	    			
	    			var subwayStation = temp1[0];
	    			var subwayLineNumber = temp2[0].trim();
	    			var subwayUpDown = temp2[1].trim();
	    			console.log(subwayStation+"역"+subwayLineNumber+"호선"+subwayUpDown);
	    			functionService.subway(subwayStation,subwayLineNumber,subwayUpDown,$scope,SubwayService);
	    		}
	    		
	    		
    	    });
	    

            var resetCommandTimeout;
            AnnyangService.start(function(listening){
                $scope.listening = listening;
            }, function(interimResult){
                $scope.interimResult = interimResult;
                $timeout.cancel(resetCommandTimeout);
            }, function(result){
                $scope.interimResult = result[0];
                resetCommandTimeout = $timeout(restCommand, 5000);
            });
            
            $scope.interimResult = DEFAULT_COMMAND_TEXT;
        };

        _this.init();
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

}(window.angular));
