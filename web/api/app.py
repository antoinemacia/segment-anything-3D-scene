from flask import Flask, jsonify, request
from flask_cors import CORS
from api.lib import MaskSegmentation, MaskTransformer
from api.lib.MaskSegmentation import MaskSegmentationError
from api.lib.MaskTransformer import MaskTransformerError

app = Flask(__name__)
app.config.from_object(__name__)

CORS(app, resources={r'/*': {'origins': '*'}})

@app.route('/segment', methods=['GET'])
def segment():
  content = request.json
  data = content['data']

  sourceUrl = data['source_url']
  pixel_coords = data['pixel_coords']

  try:
    segmentation = MaskSegmentation()
    transformer = MaskTransformer()

    mask = segmentation.segment_from_pixel_coords(sourceUrl, pixel_coords)
    points = transformer.extract_edges(mask)

    return jsonify({
        'data': {
          'mask': points.tolist(),
        },
        'code': 200
    })
  except MaskSegmentationError as e:
    return jsonify({
        'message': e.message,
        'code': 401
    })
  except MaskTransformerError as e:
    return jsonify({
        'message': e.message,
        'code': 401
    })

if __name__ == '__main__':
  app.run()