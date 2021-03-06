const extend = require('util')._extend;
const time_unit_to_ms = {
  year: 365*24*60*60*1000,
  month: 28*24*60*60*1000,
  week:   7*24*60*60*1000,
  day:      24*60*60*1000,
  hour:        60*60*1000
};

/**
 * Return list of events generated by specified list of event definision.
 *
 * @param event_list - list of events definition
 * @param from - start of date range
 * @param to - end of date range
 * @returns {Array} - events
 */
function get_events_in_dates(event_list, from, to) {
  var final_event_list = [];
  event_list.forEach((event) => {
    final_event_list = final_event_list.concat(
      get_event_instances_in_dates(event, from, to)
    );
  });
  return final_event_list.sort((e1, e2)=> e1.start_date - e2.start_date);
}

/**
 * Return list of events which are part of date range from, to and are generated
 * by event description (recurrence)
 *
 * @param event - event definition
 * @param from - start of date range
 * @param to - end of date range
 * @returns {Array} - events
 */
function get_event_instances_in_dates(event, from, to) {
  if (event.start_date > to || event.end_date < from || from > to) {
    return [];
  }
  if (event.all_day) {
    event.start_date = new Date(event.start_date).setHours(0, 0, 0, 0);
    event.end_date = new Date(event.end_date).setHours(23, 59, 59, 999);
  }
  var event_list = [];
  if (!('recurrence' in event)) {
    if (is_event_in_range(event.start_date, event.end_date, from, to)) {
      event_list.push(event);
    }
    return event_list;
  }

  var get_next_fn;
  var offset = time_unit_to_ms[event.recurrence.unit];

  var event_length = event.end_date - event.start_date;
  switch (event.recurrence.unit) {
    case 'hour':
    case 'day':
    case 'week':
      get_next_fn = (timestamp, count) => {
        return get_next_generic(offset, timestamp, count);
      };
      break;
    case 'year':
      get_next_fn = get_next_year;
      break;
    case 'month':
      get_next_fn = get_next_month;
      break;
    default:
      return [];
  }
  var cur_start = event.start_date;
  var cur_end;
  if (event.start_date < from) {
    // find first event occurrence that starts before specified date range
    cur_start = get_next_fn(
        cur_start,
        (
          (from - event.start_date)/(offset*event.recurrence.count)
        )*event.recurrence.count)
  }

  while (cur_start <= to) {
    cur_end = cur_start + event_length;
    if (is_event_in_range(cur_start, cur_end, from, to)) {
      add_event(event_list, event, cur_start, cur_end);
    }
    cur_start = get_next_fn(cur_start, event.recurrence.count);
  }
  return event_list;
}

/**
 * Return date shifted num times by offset
 *
 * @param offset - time to be shifted
 * @param timestamp - original date
 * @param num - multiplier for offset
 * @returns {number} - timestamp
 */
function get_next_generic(offset, timestamp, num) {
  return timestamp + num*offset;
}

/**
 * Returns same day but shifts by 'num' months.
 *
 * @param timestamp - original date
 * @param num - number of months to shift
 * @returns {number} - timestamp
 */
function get_next_month(timestamp, num) {
  if (num <= 0) {
    return timestamp;
  }
  var date = new Date(timestamp);
  var months = date.getMonth() + num;
  date.setFullYear(date.getFullYear() + months/12);
  date.setMonth((months)%12);
  return date.getTime();
}


/**
 * Get same day but 'num' years later.
 *
 * @param timestamp - original date
 * @param num - number of years to move
 * @returns {number} - timestamp
 */
function get_next_year(timestamp, num) {
  if (num <= 0) {
    return timestamp;
  }
  var date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + num);
  return date.getTime();
}

/**
 * Check whenever date range 'event_start' and 'event_end' is part of
 * date range specified by from and to
 *
 * @param event_start - event start date
 * @param event_end - event end date
 * @param from - date range start
 * @param to - date range end
 * @returns {boolean}
 */
function is_event_in_range(event_start, event_end, from, to) {
  if (event_start > event_end || from > to) {
    throw RangeException();
  }
  return (
    (event_start <= from && event_end >= to) || // --S-+++++++-E--
    (event_end >= from && event_end <= to) || //   --S-++++++E+---
    (event_start >= from && event_start <= to) //  ---+S++++++-E--
  );
}

/**
 * Push specified event to list of events. Added event will have start_date
 * from and end_date to.
 *
 * @param event_list - list of events
 * @param old_event - template for the event to be added to list
 * @param from - start date of new event
 * @param to - end date of new event
 */
function add_event(event_list, old_event, from, to) {
  var new_event = extend({}, old_event);
  var same_id = event_list.filter((e) => e.id.split(':', 1)[0] == new_event.id);
  new_event.id += ':' + same_id.length;
  new_event.start_date = from;
  new_event.end_date = to;
  event_list.push(new_event);
}

module.exports = {
  is_event_in_range: is_event_in_range,
  get_event_instances_in_dates: get_event_instances_in_dates,
  get_events_in_dates: get_events_in_dates
};
