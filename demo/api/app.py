from flask import Flask, jsonify, request
from flask_cors import CORS
from api.lib.MaskSegmentation import MaskSegmentation, MaskSegmentationError
from api.lib.MaskTransformer import MaskTransformer, MaskTransformerError
import logging
import json

app = Flask(__name__)
app.config.from_object(__name__)

CORS(app, resources={r'/*': {'origins': '*'}})

class APIError(Exception):
    status_code = 500

    def __init__(self, message, status_code=None, payload=None):
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv


@app.errorhandler(APIError)
def invalid_api_usage(e):
    logging.error(e.message)
    return jsonify(e.to_dict()), e.status_code

@app.route('/segment', methods=['POST'])
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
        }
    }), 200
  except MaskSegmentationError as e:
    raise APIError(e.message, 401)
  except MaskTransformerError as e:
    raise APIError(e.message, 401)
  except BaseException as e:
    raise APIError(e.message)

if __name__ == '__main__':
  app.run()