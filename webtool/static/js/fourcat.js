var dot_ticker = 0;
var timeout;
var query_key = null;
var poll_interval;

/**
 * Page init
 */
$(init);

function init() {
    // Check status of query
    query.update_status();
    setInterval(query.update_status, 4000);

    // Check queue length
    query.check_queue();

    // Start querying when go button is clicked
    $('#query-form').on('submit', function (e) {
        e.preventDefault();
        query.start();
    });

    // Data source select boxes trigger an update of the boards available for the chosen data source
    $('#datasource-select').on('change', query.update_form);
    $('#datasource-select').trigger('change');

    // Controls to change which results show up in overview
    $('.view-controls button').hide();
    $('.view-controls input, .view-controls select, .view-controls textarea').on('change', function () {
        $(this).parents('form').trigger('submit');
    });

    //expand/collapse
    $(document).on('click', '.toggle-button', toggleButton);
    $(document).on('click', '#expand-datasets', toggleDatasets);

    //tooltips
    $(document).on('mousemove', '.tooltip-trigger', tooltip.show);
    $(document).on('mouseout', '.tooltip-trigger', tooltip.hide);
    $(document).on('click', '.tooltip-trigger', tooltip.toggle);

    //popups
    $(document).on('click', '.popup-trigger', popup.show);

    // child of child of child etc interface bits
    $(document).on('click', '.processor-queue-button', processor.queue);

    //allow opening given analysis path via anchor links
    navpath = window.location.hash.substr(1);
    if (navpath.substring(0, 4) === 'nav=') {
        let analyses = navpath.substring(4).split(',');
        let navigate = setInterval(function () {
            if (analyses.length === 0) {
                clearInterval(navigate);
                return;
            }
            let breadcrumb = analyses.shift();
            if (analyses.length === 0) {
                $('.anchor-child').removeClass('anchor-child');
                $('#child-' + breadcrumb).addClass('anchor-child');
            }
            $('#child-' + breadcrumb + ' > .processor-expand > button').trigger('click');
        }, 25);
    }

    // Notify that dense threads can only be selected if a body string is provided
    $('#dense-threads-filterlabel').on('click', function(){
        if ($('#body-input').val().length == 0) {
            alert('Please provide a keyword in the post body field.');
            $('#body-input').focus();
            $('#body-input').select;
        }
    });

    //more user-friendly select multiple
    $('.multichoice-wrapper').each(function() {
        let wrapper = $(this);
        let select = $(this).find('select');
        let name = select.attr('name');
        let input = $('<input type="hidden" name="' + name + '">');
        wrapper.append(input);
        select.find('option').each(function() {
            checkbox_choice = $('<label><input type="checkbox" name="' + name + ':' + $(this).attr('value') + '"> ' + $(this).text() + '</label>');
            checkbox_choice.find('input').on('change', function() {
               let checked = wrapper.find('input:checked').map(function() {
                  return $(this).attr('name').split(':')[1];
               }).get();
               input.val(checked.join(','));
            });
            wrapper.append(checkbox_choice);
        });
        select.remove();
    });

    //regularly check for unfinished datasets
    setInterval(query.check_resultpage, 4000);

    //confirm links
    $(document).on('click', '.confirm-first', function(e) {
        let action = 'do this';

        if($(this).attr('data-confirm-action')) {
            action = $(this).attr('data-confirm-action');
        }

        if(!confirm('Are you sure you want to ' + action + '? This cannot be undone.')) {
            e.preventDefault();
            return false;
        } else {
            return true;
        }
    });
}

/**
 * Post-processor handling
 */
processor = {
    /**
     * Queue a post-processor
     *
     * Submit parameters and update result tree with new item if added
     *
     * @param e  Event that triggered queueing
     */
    queue: function (e) {
        e.preventDefault();

        if ($(this).text().includes('Run')) {
            let form = $(this).parents('form');
            let position = form.position().top + parseInt(form.height());
            $.ajax(form.attr('data-async-action') + '?async', {
                'method': form.attr('method'),
                'data': form.serialize(),
                'success': function (response) {
                    if (response.messages.length > 0) {
                        alert(response.messages.join("\n\n"));
                    }

                    if (response.html.length > 0) {
                        let new_element = $(response.html);
                        let container_id = response.container + ' .child-list';

                        let parent_list = $(container_id);

                        // this is hardcoded, see next comment

                        let targetHeight = 68;
                        // the position of the newly inserted element is always 0 for some reason
                        // so we use the fact that it's inserted at the bottom of the parent to
                        // infer it
                        let position = parent_list.offset().top + parent_list.height() - (targetHeight * 2);

                        let viewport_top = $(window).scrollTop();
                        let viewport_bottom = viewport_top + $(window).height();
                        new_element.appendTo($(parent_list));
                        new_element = $('body #' + new_element.attr('id'));
                        new_element.css('height', '0px').css('border-width', '0px').css('opacity', 0);

                        let expand = function() {
                            new_element.animate({'height': targetHeight, 'opacity': 1}, 500, false, function() { $(this).css('height', '').css('opacity', '').css('border-width', ''); });
                        }

                        if(position < viewport_top || position > viewport_bottom) {
                            $('html,body').animate({scrollTop: position + 'px'}, 500, false, expand);
                        } else {
                            expand();
                        }


                    }
                },
                'error': function (response) {
                    alert('The analysis could not be queued: ' + response.responseText);
                }
            });

            if($(this).data('original-content')) {
                $(this).html($(this).data('original-content'));
                $(this).trigger('click');
                $(this).html($(this).data('original-content'));
                form.trigger('reset');
            }
        } else {
            $(this).data('original-content', $(this).html());
            $(this).find('.byline').html('Run');
            $(this).find('.fa').removeClass('.fa-cog').addClass('fa-play');
        }
    }
};

/**
 * Query queueing and updating
 */
query = {
    /**
     * Enable query form, so settings may be changed
     */
    enable_form: function() {
        $('#query-form fieldset').prop('disabled', false);
        $('#query-status').removeClass('active');
    },

    /**
     * Disable query form, while query is active
     */
    disable_form: function() {
        $('#query-form fieldset').prop('disabled', true);
        $('#query-status').addClass('active');
    },

    /**
     * Tool window: start a query, submit it to the backend
     */
    start: function () {

        //check form input
        if (!query.validate()) {
            return;
        }

        // Show loader
        query.check_queue();

        let form = $('#query-form');
        let formdata = new FormData(form[0]);
        
        // Disable form
        query.disable_form();
        $('html,body').scrollTop(200);

        // AJAX the query to the server
        $.post({
            dataType: "text",
            url: form.attr('action'),
            data: formdata,
            cache: false,
            contentType: false,
            processData: false,

            success: function (response) {

                // If the query is rejected by the server.
                if (response.substr(0, 14) === 'Invalid query.') {
                    alert(response);
                    query.enable_form();
                }

                // If the query is accepted by the server.
                else {
                    $('#query-status .message').html('Query submitted, waiting for results');
                    query_key = response;
                    query.check(query_key);

                    // poll results every 2000 ms after submitting
                    poll_interval = setInterval(function () {
                        query.check(query_key);
                    }, 4000);
                }
            },
            error: function (error) {
                query.enable_form();
                $('#query-status .message').html(error);
            }
        });
    },

    /**
     * After starting query, periodically check its status and link to result when available
     * @param query_key  Key of started query
     */
    check: function (query_key) {
        /*
        Polls server to check whether there's a result for query
        */
        $.getJSON({
            url: '/api/check-query/',
            data: {key: query_key},
            success: function (json) {
                query.check_queue();

                let status_box = $('#query-status .message');
                let current_status = status_box.html();

                if (json.status !== current_status && json.status !== "") {
                    status_box.html(json.status);
                }

                if (json.done) {
                    clearInterval(poll_interval);
                    let keyword = json.label;

                    $('#query-results').append('<li><a href="/results/' + json.key + '">' + keyword + ' (' + json.rows + ' items)</a></li>');
                    $('#query-status .status_message .dots').html('');
                    query.enable_form();
                    alert('Query for \'' + keyword + '\' complete!');
                } else {
                    let dots = '';
                    for (let i = 0; i < dot_ticker; i += 1) {
                        dots += '.';
                    }
                    $('#query-status .dots').html(dots);

                    dot_ticker += 1;
                    if (dot_ticker > 3) {
                        dot_ticker = 0;
                    }
                }
            },
            error: function () {
                console.log('Something went wrong while checking query status');
            }
        });
    },

    check_resultpage: function() {
        let unfinished = $('.dataset-unfinished');
        if(unfinished.length === 0) {
            return;
        }

        $('.dataset-unfinished').each(function() {
            let container = $(this);
            $.getJSON({
                url: '/api/check-query/',
                data: {key: $(this).attr('data-key')},
                success: function (json) {
                    if (json.done) {
                        //refresh
                        window.location = window.location;
                        return;
                    }

                    let current_status = container.find('.dataset-status').html();
                    if (current_status !== json.status_html) {
                        container.find('.dataset-status').html(json.status_html);
                    }
                }
            });
        });
    },


    /**
     * Fancy live-updating child dataset status
     *
     * Checks if running subqueries have finished, updates their status, and re-enabled further
     * analyses if all subqueries have finished
     */
    update_status: function () {
        let queued = $('.child-wrapper.running');
        if (queued.length === 0) {
            return;
        }

        let keys = [];
        queued.each(function () {
            keys.push($(this).attr('data-dataset-key'));
        });

        $.get({
            url: "/api/check-processors/",
            data: {subqueries: JSON.stringify(keys)},
            success: function (json) {
                json.forEach(child => {
                    let target = $('body #child-' + child.key);
                    let update = $(child.html);
                    update.attr('aria-expanded', target.attr('aria-expanded'));

                    if (target.attr('data-status') === update.attr('data-status') && target.attr('class') === update.attr('class')) {
                        console.log(target.attr('data-status'));
                        return;
                    }

                    $('#dataset-results').html(child.resultrow_html);

                    target.replaceWith(update);
                    update.addClass('updated');
                    target.remove();
                });
            }
        });
    },

    check_queue: function () {
        /*
        Polls server to check how many search queries are still in the queue
        */
        $.getJSON({
            url: '/api/check-queue/',
            success: function (json) {

                // Update the query status box with the queue status
                let queue_box = $('#query-status .queue_message > span#queue_string');
                let circle = $('#query-status .queue_message > span#circle');
                if (json.count == 0) {
                    queue_box.html('Search queue is empty');
                    $(circle).removeClass('full');
                }
                else if (json.count == 1) {
                    queue_box.html('Processing 1 query.');
                    circle.className = 'full';
                    $(circle).addClass('full');
                }
                else {
                    queue_box.html('Processing ' + json.count + ' queries.');
                    $(circle).addClass('full');
                }
            },
            error: function () {
                console.log('Something went wrong when checking query queue');
            }
        });
    },

    /**
     * Validate query submission form
     *
     * @returns {boolean}  Whether the form is ready for submission
     */
    validate: function () {
        /*
        Checks validity of input; this is just a preliminary check, further checks are
        done server-side.
        */

        let valid = true;

        if ($('#check-time').is(':checked')) {
            let min_date = $('#input-min-time').val();
            let max_date = $('#input-max-time').val();
            let url_max_date;
            let url_min_date;

            // Convert the minimum date string to a unix timestamp
            if (min_date !== '') {
                url_min_date = stringToTimestamp(min_date);

                // If the string was incorrectly formatted (could be on Safari), a NaN was returned
                if (isNaN(url_min_date)) {
                    valid = false;
                    alert('Please provide a minimum date in the format dd-mm-yyyy (like 29-11-2017).');
                }
            }

            // Convert the maximum date string to a unix timestamp
            if (max_date !== '' && valid) {
                url_max_date = stringToTimestamp(max_date);
                // If the string was incorrectly formatted (could be on Safari), a NaN was returned
                if (isNaN(url_max_date)) {
                    valid = false;
                    alert('Please provide a maximum date in the format dd-mm-yyyy (like 29-11-2017).');
                }
            }

            // Input can be ill-formed, like '01-12-90', resulting in negative timestamps
            if (url_min_date < 0 || url_max_date < 0 && valid) {
                valid = false;
                alert('Invalid date(s). Check the bar on top with details on date ranges of 4CAT data.');
            }

            // Make sure the first date is later than or the same as the second
            if (url_min_date >= url_max_date && url_min_date !== 0 && url_max_date !== 0 && valid) {
                valid = false;
                alert('The first date is later than or the same as the second.\nPlease provide a correct date range.');
            }
        }

        // Country flag check
        if ($('#check-country-flag').is(':checked') && ($('#body-input').val()).length < 2 && valid) {
            
            let common_countries = ['US', 'GB', 'CA', 'AU'];
            let country = $('#country_flag').val();

            // Don't allow querying without date ranges for the common countries
            if (common_countries.includes(country)){
                if ($('#check-time').is(':checked')) {

                    let min_date = stringToTimestamp($('#input-min-time').val());
                    let max_date = stringToTimestamp($('#input-max-time').val());
                    
                    // Max three monhts for the common country flags without any body parameters
                    if (max_date - min_date > 7889231) {
                        valid = false;
                        alert('The date selected is more than three months. Select a date range of max. three months and try again. Only the most common country flags on 4chan/pol/ (US, UK, Canada, Australia) have a date restriction.');
                    }
                }
                else {
                    valid = false;
                    $('#check-time').prop('checked', true);
                    $('#check-time').trigger('change');
                    $('#input-min-time').focus().select();
                    alert('The most common country flags on 4chan/pol/ (US, Canada, Australia) have a date restriction when you want to retreive all of their posts. Select a date range of max. three months and try again.');
                }
            }
        }

        // Return true if everyting is passed
        return valid;
    },

    /**
     * Update board select list for chosen datasource
     */
    update_form: function() {
        datasource = $('#datasource-select').val();
        $.get({
            'url': '/api/datasource-form/' + datasource + '/',
            'success': function(data) {
                $('#query-form-script').remove();
                $('#query-form').removeClass();
                $('#query-form').addClass(datasource);
                $('#datasource-form').html(data.html);
                if(data.has_javascript) {
                    $('<script id="query-form-script">').attr('src', '/api/datasource-script/' + data.datasource + '/').appendTo('body');
                }
            },
            'error': function() {
                $('#datasource-select').parents('form').trigger('reset');
                alert('Invalid datasource selected.');
            }
        });
    }
};


/**
 * Tooltip management
 */
tooltip = {
    /**
     * Show tooltip
     *
     * @param e  Event that triggered tooltip display
     * @param parent  Element the toolip describes
     */
    show: function (e, parent = false) {
        if (e) {
            e.preventDefault();
        }
        if (!parent) {
            parent = this;
        }

        //determine target - last aria-controls value starting with 'tooltip-'
        let targets = $(parent).attr('aria-controls').split(' ');
        let tooltip_container = '';
        targets.forEach(function(target) {
            if(target.split('-')[0] === 'tooltip') {
                tooltip_container = target;
            }
        });
        tooltip_container = '#' + tooltip_container;

        if ($(tooltip_container).is(':hidden')) {
            $(tooltip_container).removeClass('force-width');
            let position = $(parent).position();
            let parent_width = parseFloat($(parent).css('width').replace('px', ''));
            $(tooltip_container).show();

            // figure out if this is a multiline tooltip
            content = $(tooltip_container).html();
            $(tooltip_container).html('1');
            em_height = $(tooltip_container).height();
            $(tooltip_container).html(content);
            if($(tooltip_container).height() > em_height) {
                $(tooltip_container).addClass('force-width');
            }

            let width = parseFloat($(tooltip_container).css('width').replace('px', ''));
            let height = parseFloat($(tooltip_container).css('height').replace('px', ''));
            $(tooltip_container).css('top', (position.top - height - 5) + 'px');
            $(tooltip_container).css('left', (position.left + (parent_width / 2) - (width / 2)) + 'px');
        }
    },

    /**
     * Hide tooltip
     *
     * @param e  Event that triggered the toggle
     * @param parent  Element the tooltip belongs to
     */
    hide: function (e, parent = false) {
        //determine target - last aria-controls value starting with 'tooltip-'
        if(!parent) {
            parent = this;
        }
        let targets = $(parent).attr('aria-controls');
        let tooltip_container = '';
        targets.split(' ').forEach(function(target) {
            if(target.split('-')[0] === 'tooltip') {
                tooltip_container = target;
            }
        });
        tooltip_container = '#' + tooltip_container;
        $(tooltip_container).hide();
    },
    /**
     * Toggle tooltip between shown and hidden
     * @param e  Event that triggered the toggle
     */
    toggle: function (e) {
        if(this.tagName.toLowerCase() !== 'a') {
            // Allow links to have tooltips and still work
            e.preventDefault();
        }

        let tooltip_container = $('#' + $(this).attr('aria-controls'));
        if ($(tooltip_container).is(':hidden')) {
            tooltip.show(e, this);
        } else {
            tooltip.hide(e, this);
        }
    }
};

/**
 * Popup management
 */
popup = {
    /**
     * Set up containers and event listeners for popup
     */
    is_initialised: false,
    init: function() {
      $('<div id="blur"></div>').appendTo('body');
      $('<div id="popup"><div class="content"></div><button id="popup-close"><i class="fa fa-times" aria-hidden="true"></i> <span class="sr-only">Close popup</span></button></div>').appendTo('body');
      $('body').on('click', '#blur, #popup-close', popup.hide);
      popup.is_initialised = true;
    },
    /**
     * Show popup, using the content of a designated container
     *
     * @param e  Event
     * @param parent  Parent, i.e. the button controlling the popup
     */
    show: function(e, parent) {
        if(!popup.is_initialised) {
            popup.init();
        }

        if (!parent) {
            parent = this;
        }

        if(e) {
            e.preventDefault();
        }

        //determine target - last aria-controls value starting with 'popup-'
        let targets = $(parent).attr('aria-controls').split(' ');
        let popup_container = '';
        targets.forEach(function(target) {
            if(target.split('-')[0] === 'popup') {
                popup_container = target;
            }
        });
        popup_container = '#' + popup_container;

        //copy popup contents into container
        $('#popup .content').html($(popup_container).html());
        $('#blur').attr('aria-expanded', true);
        $('#popup').attr('aria-expanded', true);

        $('#popup embed').each(function() {
            svgPanZoom(this, {contain: true});
        });
    },
    /**
     * Hide popup
     *
     * @param e  Event
     */
    hide: function(e) {
        $('#popup .content').html('');
        $('#blur').attr('aria-expanded', false);
        $('#popup').attr('aria-expanded', false);
    }
};

/**
 * Resets the form with correct checks and disablings
 */
function reset_form() {
    $('#body-input').val('').text('').attr('disabled', false).trigger('input');
    $('#subject-input').val('').text('').attr('disabled', false);
    $('#check-keyword-dense').prop('checked', false).attr('disabled', true);
    $('#dense-percentage').attr('disabled', true);
    $('#dense-length').attr('disabled', true);
    $('#check-random-sample').prop('checked', false).attr('disabled', false);
    $('#check-country-flag').prop('checked', false).attr('disabled', false);
}

/** General-purpose toggle buttons **/
function toggleButton(e, force_close=false) {
    e.preventDefault();

    target = '#' + $(this).attr('aria-controls');
    
    is_open = $(target).attr('aria-expanded') !== 'false';
    if (is_open || force_close) {
        $(target).animate({'height': 0}, 250, function() { $(this).attr('aria-expanded', false).css('height', ''); });

        // Also collapse underlying panels that are still open
        $(target).find('*[aria-expanded=true]').attr('aria-expanded', false);
    } else {
        $(target).css('visibility', 'hidden').css('position', 'absolute').css('display', 'block').attr('aria-expanded', true);
        let targetHeight = $(target).height();
        $(target).css('aria-expanded', false).css('position', '').css('display', '').css('visibility', '').css('height', 0);
        $(target).attr('aria-expanded', true).animate({"height": targetHeight}, 250, function() { $(this).css('height', '')});
    }
}

function toggleDatasets(e) {
    let new_text;
    let expanded_state;

    if($(this).text().toLowerCase().indexOf('expand') >= 0) {
        new_text = 'Collapse all';
        expanded_state = true;
    } else {
        new_text = 'Expand all';
        expanded_state = false;
    }

    $(this).text(new_text);
    $('.processor-expand > button').each(function() {
        if($('#' + $(this).attr('aria-controls')).attr('aria-expanded')) {
            $('#' + $(this).attr('aria-controls')).attr('aria-expanded', expanded_state);
        }
    });
}

/**
 * Convert input string to Unix timestamp
 *
 * @param str  Input string, yyyy-mm-dd ideally
 * @returns {*}  Unix timestamp
 */
function stringToTimestamp(str) {
    // Converts a text input to a unix timestamp.
    // Only used in Safari (other browsers use native HTML date picker)
    let date_regex = /^\d{4}-\d{2}-\d{2}$/;
    let timestamp;
    if (str.match(date_regex)) {
        timestamp = (new Date(str).getTime() / 1000)
    } else {
        str = str.replace(/\//g, '-');
        str = str.replace(/\s/g, '-');
        let date_objects = str.split('-');
        let year = date_objects[2];
        let month = date_objects[1];
        // Support for textual months
        let testdate = Date.parse(month + "1, 2012");
        if (!isNaN(testdate)) {
            month = new Date(testdate).getMonth() + 1;
        }
        let day = date_objects[0];
        timestamp = (new Date(year, (month - 1), day).getTime() / 1000);
    }
    return timestamp;
}