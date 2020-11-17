// Author: Gabucado
const map_width =  700;
const map_height = 600;
const map_visualizer = {
  width:  map_width,
  height: map_height,
  margin: {
    left:   10,
    right:  10,
    top:    10,
    bottom: 30,
    zoom: {
      scale:      [1, 15],
      translate:  [[0, 0], [map_width, map_height]]
    }
  }
};

const graph_width = map_width;
const graph_height = Math.floor(map_height/2);
const graph_visualizer = {
  width: graph_width,
  height: graph_height,
  margin: {
    left:   10,
    right:  10,
    top:    10,
    bottom: 10,
    zoom: {
      scale:      [1, 15],
      translate:  [[0, 0], [map_width, map_height]]
    }
  }
};


const comunas_geoJSON = "data\\comunas.geojson",
      comunas_data = "data\\censo.csv";

// como hacer un bocadito: https://chartio.com/resources/tutorials/how-to-show-data-on-mouseover-in-d3js/#creating-a-tooltip-using-the-title-tag
const tooltip = d3.select("body")
  .append("div")
  .attr("id", "tooltip")
  .text("placeholder")

function create_map_buttons() {
  const buttons = ["Reset", "Zoom in", "Zoom out"], 
        button_selection = d3.select("#map")
          .append("div")
          .attr("class", "flex-map-section");
  button_selection.selectAll("button")
    .data(buttons)
    .join("button")
      .attr("name", (d) => d)
      .attr("type", "button")
      .attr("class", "button")
      .text((d)=> d)
};

//          d3-zoom class' notes 
const zoom_handler = (tag) => {
  if (tag == "svg-map") {
    return zoom_handler_map
  }
};

function zoom_handler_map(event) {
  const transformation = event.transform,
        tag = "#g-map"
  d3.select(tag)
    .transition()
      .attr("transform", transformation)
};

// source:  https://observablehq.com/@d3/programmatic-zoom?collection=@d3/d3-zoom
//          d3-zoom class' notes 
function set_zoom(tag, dimensions) {
  const tag_arg = tag.replace("#", ""),
        func = zoom_handler(tag_arg),
        zoom = d3.zoom()
    .extent(
      [
        [0, 0],
        [dimensions.width, dimensions.height]
      ]
    )
    .scaleExtent(dimensions.margin.zoom.scale)
    .translateExtent(dimensions.margin.zoom.translate)
    .on("zoom", func)
    
    // d3.select(tag.replace('svg-', ""))
    d3.select(tag)
      .call(zoom)
}

function create_svg(tag, dimensions) {
  const svg_handler = d3.select(tag)
    .append("svg")
      .attr("width", dimensions.width)
      .attr("id", `svg-${tag.replace("#", "")}`)
      .attr("class", "flex-map-section")
      .attr("height", dimensions.height)
      .append("g")
        .attr("id", `g-${tag.replace("#", "")}`);
  return svg_handler;
};

function load_data_json(path, func, args) {
  d3.json(path)
    .then((data) => func(data, args))
    .catch((error) => console.log(error));
};

function data_map_setter(data, packet) {
  // Code from prof.'s lectures
  const svg = packet[0];
  const dimensions = packet[1];
  const custom_projection = d3
    .geoMercator()
      .fitSize(
        [
          dimensions.width - dimensions.margin.left - dimensions.margin.right,
          dimensions.height - dimensions.margin.top - dimensions.margin.bottom
        ], data);

  const geoPaths = d3.geoPath()
    .projection(custom_projection);


  svg
    .selectAll("path")
    .data(data.features, (d) => d.id)
    .join("path")
      .attr("d", geoPaths)
      .attr('id', (d) => d.properties.id)
      .attr("class", "map-district")
      .on("mouseover", (event, data) => {
        d3.select("#tooltip")
            .html(tooltip_filler(data))
            .style("visibility", "visible");
        })
      .on("mousemove", (event, data) => {
        d3.select("#tooltip")
          .style("top", (event.pageY-20)+"px")
          .style("left",(event.pageX+20)+"px")
        })
      .on("mouseout", () => {
        d3.select("#tooltip")
            .style("visibility", "hidden")
        })
}; 


function tooltip_filler(data) {
  const id = data.id.toString();
  const html = "<pre><toolt_head>region, province<br></toolt_head><toolt_title>name</toolt_title><br><toolt_data>Densidad:&#09 density <sup>Personas</sup>&frasl;<sub>kM<sup>2</sup></sub><br>Poblacion:&#09 pop<br>Viviendas:&#09 housing</toolt_data></pre>"
    .replace("region", data_base[id].ids.region[0] + data_base[id].ids.region.slice(1).toLowerCase())
    .replace("province", data_base[id].ids.province[0] + data_base[id].ids.province.slice(1).toLowerCase())
    .replace("name", data.properties.comuna)
    .replace("pop", data_base[id].data.demography.total)
    .replace("housing" , data_base[id].data.housing.total)
    .replace("density", data_base[id].data.demography.density)
  return html
};

function instance_map(path_geoJson, dimensions) {
  const map_svg = create_svg("#map", dimensions);
  // Create map
  load_data_json(path_geoJson, data_map_setter, [map_svg, dimensions]);
  // Set Zoom
  set_zoom("#svg-map", dimensions);
};

function parser_csv(data) {
  // ID,REGION,PROVINCIA,COMUNA,NOM_REGION,NOM_PROVIN,NOM_COMUNA,
  // TOTAL_VIVI,PARTICULAR,COLECTIVAS,TOTAL_PERS,HOMBRES,MUJERES,DENSIDAD,INDICE_MAS,INDICE_DEP,IND_DEP_JU,IND_DEP_VE
  return {
    ids: {
      id:           data.ID, 
      region_id:    data.REGION, 
      province_id:  data.PROVINCIA, 
      commune_id:   data.COMUNA,
      region:       data.NOM_REGION, 
      province:     data.NOM_PROVIN, 
      commune:      data.NOM_COMUNA
    },
    data: {
      housing: {
        total:      parseInt(data.TOTAL_VIVI),
        particular: parseInt(data.PARTICULAR),
        colective:  parseInt(data.COLECTIVAS)
      },
      demography: {
        total:      parseInt(data.TOTAL_PERS),
        males:      parseInt(data.HOMBRES),
        females:    parseInt(data.MUJERES),
        density:    parseFloat(data.DENSIDAD),
        proportion: {
          malfem:   parseFloat(data.INDICE_MAS),
          denpend:  parseFloat(data.INDICE_DEP),
          dep_ju:   parseFloat(data.IND_DEP_JU),
          dep_ve:   parseFloat(data.IND_DEP_VE)
        }
      }
    }
  }
};

function load_data_csv(path, parser, func, args) {
  d3.csv(path, parser)
    .then((data) => func(data, args))
    .catch((error) => console.log(error));
};

function instance_graphs(attribute_map, attribute_pie, attibute_top, attribute_bottom) {}

function instance_ui_objects() {
  // Create buttons
  create_map_buttons()
}

function instance_data(path) {
  const data_setter = (data) => {
    const object_data = new Object();
    data.forEach(element => {object_data[element.ids.id] = element})
    data_base = object_data;
  };
  load_data_csv(path, parser_csv, data_setter, null);
}

let data_base = null;
instance_data(comunas_data);

instance_map(comunas_geoJSON, map_visualizer);
// instance_graphs(attribute_00, attribute_01, attribute_10,attribute_11)

instance_ui_objects()