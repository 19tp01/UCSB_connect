const express = require("express");
const axios = require("axios");
const config = require("config");
const router = express.Router();
const auth = require("../../middleware/auth");
const normalize = require("normalize-url");
const {
  check,
  validationResult,
} = require("express-validator");

const Profile = require("../../models/Profile");
const User = require("../../models/User");
const Post = require("../../models/Post");

// @route   GET api/profile/me
// @desc    Get our profile based on UserID in jwt
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res
        .status(400)
        .json({
          msg: "There is no profile for this user",
        });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private
router.post("/", [auth], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ errors: errors.array() });
  }

  const {
    company,
    website,
    location,
    bio,
    status,
    githubusername,
    skills,
    youtube,
    facebook,
    twitter,
    instagram,
    linkedin,
  } = req.body;

  // Build profile object
  const profileFields = {
    user: req.user.id,
    company,
    location,
    website:
      website && website !== ""
        ? normalize(website, { forceHttps: true })
        : "",
    bio,
    skills: Array.isArray(skills)
      ? skills
      : skills
          .split(",")
          .map((skill) => " " + skill.trim()),
    status,
    githubusername,
  };

  // Build social object
  profileFields.social = {};
  if (youtube)
    profileFields.social.youtube = youtube;
  if (twitter)
    profileFields.social.twitter = twitter;
  if (facebook)
    profileFields.social.facebook = facebook;
  if (linkedin)
    profileFields.social.linkedin = linkedin;
  if (instagram)
    profileFields.social.instagram = instagram;

  try {
    let profile = await Profile.findOne({
      user: req.user.id,
    });

    if (profile) {
      // Updateprofile
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true }
      );

      return res.json(profile);
    }

    // Create profile
    profile = new Profile(profileFields);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
// @route   GET api/profile/user/:user_id
// @desc    Gets profile by user ID
// @access  Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name", "avatar"]);

    if (!profile)
      return res
        .status(400)
        .json({ msg: "Profile not found" });

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    if (err.kind == "ObjectId") {
      return res
        .status(400)
        .json({ msg: "Profile not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET api/profile/
// @desc    Gets all profiles
// @access  Public
router.get("/", async (req, res) => {
  try {
    const profiles =
      await Profile.find().populate("user", [
        "name",
        "avatar",
      ]);
    res.json(profiles);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/profile/
// @desc    Delete current profile, user & posts
// @access  Public
router.delete("/", auth, async (req, res) => {
  try {
    // Remove user's posts
    await Post.deleteMany({ user: req.user.id });
    // Remove profile
    await Profile.findOneAndRemove({
      user: req.user.id,
    });
    // Remove user
    await User.findOneAndRemove({
      _id: req.user.id,
    });

    res.json({ msg: "User removed" });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required")
        .not()
        .isEmpty(),
      check("company", "Company is required")
        .not()
        .isEmpty(),
      check("from", "From date is required")
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };

    try {
      // fetch profile to add exp to
      const profile = await Profile.findOne({
        user: req.user.id,
      });

      profile.experience.unshift(newExp);

      profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete(
  "/experience/:exp_id",
  auth,
  async (req, res) => {
    try {
      const profile = await Profile.findOne({
        user: req.user.id,
      });

      // Get removed index
      const removeIndex = profile.experience
        .map((item) => item.id)
        .indexOf(req.params.exp_id);

      profile.experience.splice(removeIndex, 1);

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   PUT api/profile/education
// @desc    Add profile education
// @access  Private
router.put(
  "/education",
  [
    auth,
    [
      check("school", "School is required")
        .not()
        .isEmpty(),
      check("degree", "Degree is required")
        .not()
        .isEmpty(),
      check(
        "fieldofstudy",
        "Field of study is required"
      )
        .not()
        .isEmpty(),
      check("from", "From date is required")
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      // fetch profile to add exp to
      const profile = await Profile.findOne({
        user: req.user.id,
      });

      profile.education.unshift(newEdu);

      profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   DELETE api/profile/education/edu:_id
// @desc    Delete education from profile
// @access  Private
router.delete(
  "/education/:exp_id",
  auth,
  async (req, res) => {
    try {
      const profile = await Profile.findOne({
        user: req.user.id,
      });

      // Get removed index
      const removeIndex = profile.education
        .map((item) => item.id)
        .indexOf(req.params.edu_id);

      profile.education.splice(removeIndex, 1);

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   GET api/profile/github/:username
// @desc    Get user repos from Github
// @access  Public
router.get(
  "/github/:username",
  async (req, res) => {
    try {
      const uri = encodeURI(
        `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
      );
      const headers = {
        "user-agent": "node.js",
        Authorization: `token ${config.get(
          "githubToken"
        )}`,
      };

      const gitHubResponse = await axios.get(
        uri,
        { headers }
      );
      return res.json(gitHubResponse.data);
    } catch (err) {
      console.error(err.message);
      return res
        .status(404)
        .json({ msg: "No Github profile found" });
    }
  }
);

module.exports = router;
