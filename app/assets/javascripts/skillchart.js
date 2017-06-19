
jQuery(document).ready(function(){
  jQuery('.skillbar').each(function(){
    jQuery(this).find('.skillbar-bar').animate({
      width:jQuery(this).attr('data-percent')
    },6000);
  });
});

/* horizontal - vertical bar*/
(function ($) {
  $.fn.extend({
    skillbar: function (options) {
      var settings = $.extend({
        animationSpeed: 2000,
        barLength: 200,
        orientation: 'h',
        barWidth: 10,
        barColor: 'red',
        label: ' ',
        value: 100
      }, options);
      return this.each(function () {
        var valueLabelHeight = 0;
        var progressContainer = $(this);
        if (settings.orientation == 'h') {
          progressContainer.addClass('skillbar horizontal').append('<span class="bar-label"></span><span class="bar-level-wrapper"><span class="bar-level"></span></span><span class="bar-percent"></span>');
          var progressLabel = progressContainer.find('.bar-label').html(settings.label);
          var progressBar = progressContainer.find('.bar-level').attr('data-value', settings.value);
          var progressBarWrapper = progressContainer.find('.bar-level-wrapper');
          progressBar.css({
            height: settings.barWidth,
            width: 0,
            backgroundColor: settings.barColor
          });
          var valueLabel = progressContainer.find('.bar-percent');
          valueLabel.html('0');
        } else {
          progressContainer.addClass('skillbar vertical').append('<span class="bar-percent"></span><span class="bar-level-wrapper"><span class="bar-level"></span></span><span class="bar-label"></span>');
          var progressLabel = progressContainer.find('.bar-label').html(settings.label);
          var progressBar = progressContainer.find('.bar-level').attr('data-value', settings.value);
          var progressBarWrapper = progressContainer.find('.bar-level-wrapper');
          progressContainer.css('height', settings.barLength);
          progressBar.css({
            height: settings.barLength,
            top: settings.barLength,
            width: settings.barWidth,
            backgroundColor: settings.barColor
          });
          progressBarWrapper.css({
            height: settings.barLength,
            width: settings.barWidth
          });
          var valueLabel = progressContainer.find('.bar-percent');
          valueLabel.html('0');
          valueLabelHeight = parseInt(valueLabel.outerHeight());
          valueLabel.css({
            top: (settings.barLength - valueLabelHeight) + 'px'
          });
        }
        animateProgressBar(progressBar);

        function animateProgressBar(progressBar) {
          var level = parseInt(progressBar.attr('data-value'));
          if (level > 100) {
            level = 100;
            alert('max value cannot exceed 100 percent');
          }
          var w = settings.barLength * level / 100;
          if (settings.orientation == 'h') {
            progressBar.animate({
              width: w
            }, {
              duration: 2000,
              step: function (currentWidth) {
                var percent = parseInt(currentWidth / settings.barLength * 100);
                if (isNaN(percent))
                  percent = 0;
                progressContainer.find('.bar-percent').html(percent + '%');
              }
            });
          } else {
            var h = settings.barLength - settings.barLength * level / 100;
            progressBar.animate({
              top: h
            }, {
              duration: 2000,
              step: function (currentValue) {
                var percent = parseInt((settings.barLength - parseInt(currentValue)) / settings.barLength * 100);
                if (isNaN(percent))
                  percent = 0;
                progressContainer.find('.bar-percent').html(Math.abs(percent) + '%');
              }
            });
            progressContainer.find('.bar-percent').animate({
              top: (h - valueLabelHeight)
            }, 2000);
          }
        }
      });
    }
  });
})(jQuery);
/* circular chart */
(function ($) {
  $.fn.extend({
    //pass the options variable to the function
    percentcircle: function (options) {
      //Set the default values, use comma to separate the settings, example:
      var defaults = {
          animate: true,
          diameter: 100,
          guage: 4,
          coverBg: '#fff',
          bgColor: '#ccc',
          fillColor: '#5c93c8',
          percentSize: '15px',
          percentWeight: 'normal'
        },
        styles = {
          cirContainer: {
            'width': defaults.diameter,
            'height': defaults.diameter
          },
          cir: {
            'position': 'relative',
            'text-align': 'center',
            'width': defaults.diameter,
            'height': defaults.diameter,
            'border-radius': '100%',
            'background-color': defaults.bgColor,
            'background-image': 'linear-gradient(91deg, transparent 50%, ' + defaults.bgColor + ' 50%), linear-gradient(90deg, ' + defaults.bgColor + ' 50%, transparent 50%)'
          },
          cirCover: {
            'position': 'relative',
            'top': defaults.guage,
            'left': defaults.guage,
            'text-align': 'center',
            'width': defaults.diameter - (defaults.guage * 2),
            'height': defaults.diameter - (defaults.guage * 2),
            'border-radius': '100%',
            'background-color': defaults.coverBg
          },
          percent: {
            'display': 'block',
            'width': defaults.diameter,
            'height': defaults.diameter,
            'line-height': defaults.diameter + 'px',
            'vertical-align': 'middle',
            'font-size': defaults.percentSize,
            'font-weight': defaults.percentWeight,
            'color': defaults.fillColor
          }
        };
       var that = this,
        template = '<div><div class="ab"><div class="cir"><span class="perc">{{percentage}}</span></div></div></div>',                  
        options =  $.extend(defaults, options)

      function init() {
        that.each(function () {
          var $this = $(this),
            //we need to check for a percent otherwise set to 0;
            perc = Math.round($this.data('percent')), //get the percentage from the element
            deg = perc * 3.6,
            stop = options.animate ? 0 : deg,
            $chart = $(template.replace('{{percentage}}', perc + '%'));
          //set all of the css properties forthe chart
          $chart.css(styles.cirContainer).find('.ab').css(styles.cir).find('.cir').css(styles.cirCover).find('.perc').css(styles.percent);
          $this.append($chart); //add the chart back to the target element
          setTimeout(function () {
            animateChart(deg, parseInt(stop), $chart.find('.ab')); //both values set to the same value to keep the function from looping and animating    
          }, 250)
        });
      }
      var animateChart = function (stop, curr, $elm) {
        var deg = curr;
        if (curr <= stop) {
          if (deg >= 180) {
            $elm.css('background-image', 'linear-gradient(' + (90 + deg) + 'deg, transparent 50%, ' + options.fillColor + ' 50%),linear-gradient(90deg, ' + options.fillColor + ' 50%, transparent 50%)');
          } else {
            $elm.css('background-image', 'linear-gradient(' + (deg - 90) + 'deg, transparent 50%, ' + options.bgColor + ' 50%),linear-gradient(90deg, ' + options.fillColor + ' 50%, transparent 50%)');
          }
          curr++;
          setTimeout(function () {
            animateChart(stop, curr, $elm);
          }, 1);
        }
      };
      init(); //kick off the goodness
    }
  });
})(jQuery);