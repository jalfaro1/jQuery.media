"use strict";

require([
    'jquery',
    'jquery.media',
    'jquery.media/tweens',
    'jquery.media/tweens.capture',
], function ($, Media) {
    var json = 'files/tweens.json';
    //json = false;
    var src = 'files/video2.ogv';

    var video = Media.create('#video');
    video.source(src);

    var nome = '';

    var outFn = function (tween) {
        $('#captures li[data-name="' + tween.name + '"]').removeClass('selected');

        if (!tween.confirmed) {
            this.pause();

            if (!confirm('Manter este tween?')) {
                nome = tween.name;
                this.removeTween(tween.name);
                this.seek(tween.points[0].ms / 1000);
                $('#captures li[data-name="' + tween.name + '"]').remove();
            } else {
                tween.confirmed = true;
                $('#captures').append('<li data-name="' + tween.name + '" data-time="' + tween.points[0].ms + '">' + tween.name + '</li>');
            }
        }

        removeMarkerPoints();
    };

    var inFn = function (tween) {
        tween.target.attr('class', '').find('.status').html(tween.status);
        $('#captures li[data-name="' + tween.name + '"]').addClass('selected');

        $.each(tween.points, function (k, point) {
            insertMarkerPoint(point);
        });
    };

    var statusChangeFn = function (tween) {
        if (tween.status === 'hide') {
            tween.target.attr('class', '').hide();
        } else {
            tween.target.show();
            tween.target.attr('class', tween.status);
        }

        tween.target.find('.status').html(tween.status);
    };

    var destroyFn = function (tween) {
        tween.target.remove();
    };

    var insertMarkerPoint = function (point) {
        $('<div class="capture-point"></div>')
            .css({
                "left": point.coords[0] + "%",
                "top": point.coords[1] + "%"
            })
            .data('point', point)
            .appendTo('#contenedor');
    };

    var removeMarkerPoints = function () {
        $('#contenedor').find('.capture-point').remove();
    };

    var sortObject = function (o) {
        var sorted = {}, key, keys = [];

        for (key in o) {
            if (o.hasOwnProperty(key)) {
                keys.push(key);
            }
        }

        keys.sort(function (a, b) {
            function chunkify(t) {
                var tz = [], x = 0, y = -1, n = 0, i, j;

                while (i = (j = t.charAt(x++)).charCodeAt(0)) {
                  var m = (i == 46 || (i >=48 && i <= 57));
                  if (m !== n) {
                    tz[++y] = "";
                    n = m;
                  }
                  tz[y] += j;
                }
                return tz;
              }

              var aa = chunkify(a);
              var bb = chunkify(b);

              for (x = 0; aa[x] && bb[x]; x++) {
                if (aa[x] !== bb[x]) {
                  var c = Number(aa[x]), d = Number(bb[x]);
                  if (c == aa[x] && d == bb[x]) {
                    return c - d;
                  } else return (aa[x] > bb[x]) ? 1 : -1;
                }
              }
              return aa.length - bb.length;
        });

        for (key = 0; key < keys.length; key++) {
            sorted[keys[key]] = o[keys[key]];
        }

        return sorted;
    };

    if (json) {
        $.getJSON(json, function (data) {
            $.each(data, function (name, value) {
                $('#captures').append('<li data-name="' + name + '" data-time="' + value.points[0].ms + '">' + name + '</li>');

                video.setTween(name, {
                    enabled: true,
                    points: value.points,
                    target: $('<div>' + name + ' <em class="status"></em></div>').appendTo('#contenedor'),
                    out: outFn,
                    in: inFn,
                    statusChange: statusChangeFn,
                    destroy: destroyFn
                });

                video.tweens[name].confirmed = true;
            });
        });
    }

    $('body').bind('keydown', function (e) {
        if (e.keyCode === 32) {
            video.playPause();
            return;
        }

        if (e.keyCode === 37) {
            if (e.shiftKey) {
                video.seek('-2');
            } else {
                video.seek('-0.2');
            }
            
            return;
        }

        if (e.keyCode === 39) {
            if (e.shiftKey) {
                video.seek('+2');
            } else {
                video.seek('+0.2');
            }
            return;
        }

        if (e.keyCode === 13) {
            if (e.shiftKey) {
                if (video.captureTweenPaused()) {
                    video.captureTweenResume();
                } else {
                    video.captureTweenPause();
                }
            } else {
                if (video.captureTweenStarted()) {
                    video.captureTweenStop(function (points) {
                        var tweenName = prompt('Nome do tween', nome);
                        nome = '';
                        this.playbackRate(1);

                        if (!tweenName) {
                            this.seek(points[0].ms / 1000);
                            return;
                        }

                        $('#captures li[data-name="' + tweenName + '"]').remove();

                        this.setTween(tweenName, {
                            enabled: true,
                            data: points,
                            points: points,
                            target: $('<div>' + tweenName + ' <em class="status"></em></div>').appendTo('#contenedor'),
                            out: outFn,
                            in: inFn,
                            statusChange: statusChangeFn,
                            destroy: destroyFn
                        }).seek(points[0].ms / 1000).play();

                        this.tweens[tweenName].capturedPoints = points;
                    });
                } else {
                    video.captureTweenStart({
                        click: insertMarkerPoint
                    });
                }
            }
        }
    });

    $('#captures').delegate('li', 'click', function (e) {
        if (e.shiftKey && confirm('Eliminar tween?')) {
            nome = $(this).data('name');
            video.removeTween(nome);
            $('#captures li[data-name="' + nome + '"]').remove();
        }

        var tempo = $(this).data('time') / 1000;
        video.seek(tempo).play();
    });

    $('#get-tweens').click(function () {
        var tweens = {};

        if (video.tweens) {
            $.each(video.tweens, function (name, value) {
                tweens[name] = {
                    points: value.capturedPoints
                };
            });
        }

        tweens = sortObject(tweens);

        $('<textarea></textarea>').val(JSON.stringify(tweens, null, '\t')).insertAfter(this).select().blur(function () {
            $(this).remove();
        });
    });
});
