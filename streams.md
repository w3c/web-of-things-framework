# Object Models for Data Streams

*Note: this has yet to be implemented in the server code*

Some sensors produces streams of data as a function of time. Data streams can carry one or more data channels where each channel is a single number or a vector.

An example would be an electrocardiography (ECG) sensor which is used to produce a waveform of the heart's activity over a time period of a few seconds. In a hospital the sensor and display are connected together with electrical leads.

In the Web of Things, the sensor and the display are both modelled as "things". In place of leads, we set the sensor's output property to the display. The display could be an object in a web page script that displays the waveform using the HTML CANVAS element, or it could be a remote service, e.g. a device that acts as an oscilloscope. The display could have properties that control its behaviour, e.g. how many seconds of data to show. It could also have actions, e.g. to freeze the display to allow a waveform to be studied in more detail.

Script developers ony need to know the object model for the sensor and display. The details of the underlying protocols are dealt with automatically by the server platform. For this to work, we need a standard way to describe data streams as part of the data model for "things".

For a simple thing property, e.g. the state of a light switch, setting the value of the property on the proxy results in the server sending a message to update the physical state of the switch. For streams, the semantics is slightly different. Setting the value of the proxy's' output directs the data stream to the designated object.

This model assumes that a stream can only be sent to a single data sink.  If you want to have multiple sinks, you will need to use a "thing" that acts as splitter. In principle, the thing acting as the sensor could do this, e.g. providing one output for a data logger, and another for a display.